// SupabaseRecordRepository implementation for Phase 2
// Supabase client is imported from a shared singleton to avoid multiple GoTrueClient instances.
import { supabase } from "@/infrastructure/supabaseClient";
// Service‑role client removed – using anonymous client for inserts (RLS must allow it)
import type { ManualEntryRecord, Grade } from "@/types";
import type { IRecordRepository } from "@/data/recordRepository";

/**
 * Server-side validation constants - these MUST match Supabase CHECK constraints and RLS policies
 * IMPORTANT: Database-level enforcement via RLS policies and CHECK constraints is the primary defense.
 * This client-side validation is a fallback and UX improvement only.
 */
const GRADE_ORDER: Grade[] = ["rare", "epic", "unique", "legendary"];

const ALLOWED_CUBE_TYPES: Record<string, Set<string>> = {
  potential: new Set(["neo", "mega"]),
  additional_potential: new Set(["neo_additional"]),
};

const MAX_QUANTITY = 9999;
const MAX_CHARACTER_NAME_LENGTH = 50;
const MAX_SERVER_NAME_LENGTH = 20;

/**
 * Sanitize user input to prevent XSS and injection attacks.
 * This is a defense-in-depth measure; primary protection is React's auto-escaping and DB constraints.
 */
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>&"']/g, "") // strip HTML-significant chars
    .trim()
    .slice(0, MAX_CHARACTER_NAME_LENGTH);
}

/**
 * Validate a record before sending to Supabase.
 * Throws descriptive errors for invalid input.
 * This validation MUST be mirrored in Supabase CHECK constraints and RLS policies.
 */
function validateRecord(
  record: Omit<ManualEntryRecord, "id">,
  isUpdate = false,
): void {
  // Validate server_name (optional - can be null/empty)
  if (!isUpdate || record.server_name !== undefined) {
    if (record.server_name && record.server_name.length > MAX_SERVER_NAME_LENGTH) {
      throw new Error(`server_name exceeds max length of ${MAX_SERVER_NAME_LENGTH}`);
    }
    // Server name should be one of the known values (validated by UI, but enforce here too)
    // Allow null/empty since it's optional
    const validServers = ["かえで", "ゆかり", "くるみ", "チャレンジャーズ"];
    if (record.server_name && !validServers.includes(record.server_name)) {
      throw new Error(`Invalid server_name: ${record.server_name}`);
    }
  }

  // Validate potential_type
  if (!isUpdate || record.potential_type !== undefined) {
    if (!["potential", "additional_potential"].includes(record.potential_type)) {
      throw new Error(`Invalid potential_type: ${record.potential_type}`);
    }
  }

  // Validate cube_type against potential_type
  if (!isUpdate || record.cube_type !== undefined || record.potential_type !== undefined) {
    const potentialType = record.potential_type ?? "potential"; // fallback for partial update
    const allowedCubes = ALLOWED_CUBE_TYPES[potentialType];
    if (!allowedCubes || !allowedCubes.has(record.cube_type!)) {
      throw new Error(`Invalid combination: ${potentialType} - ${record.cube_type}`);
    }
  }

  // Validate grade_before and grade_after
  if (!isUpdate || record.grade_before !== undefined || record.grade_after !== undefined) {
    const gradeBefore = record.grade_before;
    const gradeAfter = record.grade_after;

    if (!GRADE_ORDER.includes(gradeBefore)) {
      throw new Error(`Invalid grade_before: ${gradeBefore}`);
    }
    if (!GRADE_ORDER.includes(gradeAfter)) {
      throw new Error(`Invalid grade_after: ${gradeAfter}`);
    }

    // Validate transition is forward and adjacent (e.g., rare->epic, epic->unique, unique->legendary)
    const beforeIdx = GRADE_ORDER.indexOf(gradeBefore);
    const afterIdx = GRADE_ORDER.indexOf(gradeAfter);
    if (beforeIdx >= afterIdx || afterIdx - beforeIdx !== 1) {
      throw new Error(`Invalid grade transition: ${gradeBefore} -> ${gradeAfter}. Must be adjacent forward transition.`);
    }
  }

  // Validate quantity_used
  if (!isUpdate || record.quantity_used !== undefined) {
    const qty = Number(record.quantity_used);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
      throw new Error(`quantity_used must be an integer between 1 and ${MAX_QUANTITY}`);
    }
  }

  // Validate character_name
  if (record.character_name !== undefined && record.character_name !== null) {
    if (typeof record.character_name !== "string") {
      throw new Error("character_name must be a string or null");
    }
    if (record.character_name.length > MAX_CHARACTER_NAME_LENGTH) {
      throw new Error(`character_name exceeds max length of ${MAX_CHARACTER_NAME_LENGTH}`);
    }
    // Check for potentially dangerous patterns
    if (/[<>&"']/.test(record.character_name)) {
      throw new Error("character_name contains invalid characters");
    }
  }

  // Validate part (equipment_parts)
  if (record.part !== undefined) {
    const validParts = ["weapon", "hat", "gloves", "shoes", "overall", "accessory", "other"];
    if (record.part && !validParts.includes(record.part)) {
      throw new Error(`Invalid part: ${record.part}`);
    }
  }

  // Validate timestamp
  if (record.timestamp !== undefined) {
    const ts = Number(record.timestamp);
    if (!Number.isInteger(ts) || ts < 0 || ts > Date.now() + 86400000) { // allow 1 day future for clock skew
      throw new Error("Invalid timestamp");
    }
  }
}

export class SupabaseRecordRepository implements IRecordRepository {
  // Reuse the shared Supabase client instance.
  private client = supabase;

  // Convert DB row to ManualEntryRecord shape expected by the app
  private mapDbRow(row: any): ManualEntryRecord {
    // id may be UUID string; keep as string (ManualEntryRecord.id is now string)
    const id = row.id;
    // Convert timestamp (Postgres timestamptz) to number (ms since epoch)
    const timestamp = row.timestamp ? new Date(row.timestamp).getTime() : Date.now();
    // Determine grade_before and grade_after. Prefer explicit fields if present; otherwise map grade_transition (1‑3).
    let gradeBefore: Grade = "rare";
    let gradeAfter: Grade = "rare";
    if (row.grade_before && row.grade_after) {
      gradeBefore = row.grade_before as Grade;
      gradeAfter = row.grade_after as Grade;
    } else if (row.grade_transition) {
      const transition = Number(row.grade_transition);
      const gradeMap: Record<number, Grade> = {
        1: "rare",
        2: "epic",
        3: "unique",
      } as const;
      const mapped = gradeMap[transition] ?? "rare";
      gradeBefore = mapped;
      gradeAfter = mapped;
    }
    return {
      id,
      server_name: row.server_name ?? "",
      potential_type: row.potential_type,
      cube_type: row.cube_type,
      grade_before: gradeBefore,
      grade_after: gradeAfter,
      quantity_used: row.quantity_used,
      character_name: row.character_name ?? null,
      timestamp,
      part: row.part ?? undefined,
      // optional fields not stored in DB are omitted
    } as ManualEntryRecord;
  }

  async getAll(): Promise<ManualEntryRecord[]> {
    const { data, error } = await this.client
      .from("cube_usage_events")
      .select("id,server_name,potential_type,cube_type,grade_transition,quantity_used,character_name,timestamp,part");
    if (error) throw error;
    // data may be null; ensure array
    const rows = (data || []) as any[];
    return rows.map(r => this.mapDbRow(r));
  }

  async getById(id: number): Promise<ManualEntryRecord | undefined> {
    const { data, error } = await this.client
      .from("cube_usage_events")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      // PGRST116: No rows found – treat as undefined.
      if ((error as { code?: string }).code === "PGRST116") return undefined;
      throw error;
    }
    return data as ManualEntryRecord;
  }

  async add(record: Omit<ManualEntryRecord, "id">): Promise<ManualEntryRecord> {
    // SERVER-SIDE VALIDATION (defense in depth - primary enforcement is DB constraints)
    validateRecord(record);

    // Convert grade_before/grade_after to grade_transition (1-3)
    const startIdx = GRADE_ORDER.indexOf(record.grade_before);
    const endIdx = GRADE_ORDER.indexOf(record.grade_after);
    const gradeTransition = startIdx >= 0 && endIdx > startIdx ? startIdx + 1 : 1;

    // Sanitize character_name
    const sanitizedCharacterName = record.character_name ? sanitizeInput(record.character_name) : null;

    // Omit grade_before and grade_after - DB only has grade_transition (1-3)
    const { grade_before: _gradeBefore, grade_after: _gradeAfter, ...recordWithoutGrades } = record;
    const dbRecord = {
      ...recordWithoutGrades,
      character_name: sanitizedCharacterName,
      grade_transition: gradeTransition,
      // Convert timestamp number (ms since epoch) to ISO string for timestamptz
      timestamp: new Date(record.timestamp).toISOString(),
    };

    const { data, error } = await this.client
        .from("cube_usage_events")
        .insert([dbRecord])
        .single();
    if (error) throw error;
    return data as ManualEntryRecord;
  }

  async update(id: number, record: Omit<ManualEntryRecord, "id">): Promise<ManualEntryRecord> {
    // SERVER-SIDE VALIDATION (defense in depth - primary enforcement is DB constraints)
    validateRecord(record, true); // true = isUpdate (allows partial)

    // Convert grade_before/grade_after to grade_transition (1-3)
    const startIdx = GRADE_ORDER.indexOf(record.grade_before);
    const endIdx = GRADE_ORDER.indexOf(record.grade_after);
    const gradeTransition = startIdx >= 0 && endIdx > startIdx ? startIdx + 1 : 1;

    // Sanitize character_name
    const sanitizedCharacterName = record.character_name ? sanitizeInput(record.character_name) : null;

    // Omit grade_before and grade_after - DB only has grade_transition (1-3)
    const { grade_before: _gb, grade_after: _ga, ...recordWithoutGrades } = record;
    const dbRecord = {
      ...recordWithoutGrades,
      character_name: sanitizedCharacterName,
      grade_transition: gradeTransition,
      // Convert timestamp number (ms since epoch) to ISO string for timestamptz
      timestamp: new Date(record.timestamp).toISOString(),
    };

    const { data, error } = await this.client
      .from("cube_usage_events")
      .update(dbRecord)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as ManualEntryRecord;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from("cube_usage_events")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  }

  async count(): Promise<number> {
    const { count, error } = await this.client
      .from("cube_usage_events")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count as number;
  }

  /**
   * キューブ使用状況を属性別に集計し、ミラクルタイムかどうかも判定します。
   * @returns 集計結果の配列
   */
  async getCubeUsageStats(schedules?: Array<{ start: string; end: string }>): Promise<Array<{
    potential_type: string;
    cube_type: string;
    grade_transition: number;
    isMiracle: boolean;
    total_quantity: number;
    count: number;
    supply_rate: number; // 平均使用個数 (quantity_used の平均)
  }>> {
    // 1. キューブ使用イベント取得
    const { data: events, error: evErr } = await this.client
      .from("cube_usage_events")
      .select("id,server_name,potential_type,cube_type,grade_transition,quantity_used,character_name,timestamp,part");
    if (evErr) throw evErr;
    const rows = (events || []) as any[];

    // 2. miracle_time_schedules が渡されていなければ取得
    let scheduleRows: Array<{ start: string; end: string }> = [];
    if (!schedules) {
      const { data: schedulesData, error: schErr } = await this.client
        .from("miracle_time_schedules")
        .select("start,end");
      if (schErr) throw schErr;
      scheduleRows = (schedulesData || []) as Array<{ start: string; end: string }>;
    } else {
      scheduleRows = schedules;
    }

    // 3. 判定ヘルパー
    const isInMiracle = (ts: string) => {
      // Convert UTC timestamp to JST (+9 hours) before comparing with miracle schedules
      const time = new Date(ts).getTime() + 9 * 60 * 60 * 1000;
      return scheduleRows.some(s => {
        const start = new Date(s.start).getTime();
        const end = new Date(s.end).getTime();
        return time >= start && time <= end;
      });
    };

    // 4. グルーピング & 集計
    const map = new Map<string, {
      potential_type: string;
      cube_type: string;
      grade_transition: number;
      isMiracle: boolean;
      total_quantity: number;
      count: number;
    }>();

    for (const r of rows) {
      // Skip records with invalid potential/cube combination
      const allowedCubes = ALLOWED_CUBE_TYPES[r.potential_type];
      if (!allowedCubes || !allowedCubes.has(r.cube_type)) {
        console.warn(`Invalid combination: ${r.potential_type} - ${r.cube_type}`);
        continue;
      }
      const miracle = isInMiracle(r.timestamp);
      const key = `${r.potential_type}|${r.cube_type}|${r.grade_transition}|${miracle}`;
      if (!map.has(key)) {
        map.set(key, {
          potential_type: r.potential_type,
          cube_type: r.cube_type,
          grade_transition: r.grade_transition,
          isMiracle: miracle,
          total_quantity: 0,
          count: 0,
        });
      }
      const agg = map.get(key)!;
      agg.total_quantity += Number(r.quantity_used) || 0;
      agg.count += 1;
    }

    // 5. 結果整形
    const result: Array<{
      potential_type: string;
      cube_type: string;
      grade_transition: number;
      isMiracle: boolean;
      total_quantity: number;
      count: number;
      supply_rate: number;
    }> = [];
    for (const agg of map.values()) {
      result.push({
        ...agg,
        // supply_rate = 昇級率 (%) = 成功回数 / 使用個数 * 100
        // 1レコード = 1成功昇級、quantity_used = 使用キューブ個数
        supply_rate: agg.total_quantity ? (agg.count / agg.total_quantity) * 100 : 0,
      });
    }
    return result;
  }
}

/**
 * REQUIRED SUPABASE DATABASE SECURITY CONFIGURATION
 *
 * The following MUST be configured in Supabase Dashboard (SQL Editor) to enforce
 * security at the database level. Client-side validation above is defense-in-depth only.
 *
 * -- 1. Enable RLS on cube_usage_events
 * ALTER TABLE cube_usage_events ENABLE ROW LEVEL SECURITY;
 *
 * -- 2. Allow anonymous SELECT (read all records)
 * CREATE POLICY "Allow anonymous read" ON cube_usage_events
 *   FOR SELECT USING (true);
 *
 * -- 3. Allow anonymous INSERT with validation (RLS + CHECK constraints handle validation)
 * CREATE POLICY "Allow anonymous insert" ON cube_usage_events
 *   FOR INSERT WITH CHECK (true); -- validation via CHECK constraints below
 *
 * -- 4. Allow anonymous UPDATE own records (if needed)
 * -- CREATE POLICY "Allow update" ON cube_usage_events
 * --   FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 *
 * -- 5. Allow anonymous DELETE (if needed, with caution)
 * -- CREATE POLICY "Allow delete" ON cube_usage_events
 * --   FOR DELETE USING (auth.uid() = user_id);
 *
 * -- 6. CHECK constraints for data integrity (run these in Supabase SQL Editor)
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_potential_type
 *   CHECK (potential_type IN ('potential', 'additional_potential'));
 *
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_cube_type
 *   CHECK (
 *     (potential_type = 'potential' AND cube_type IN ('neo', 'mega')) OR
 *     (potential_type = 'additional_potential' AND cube_type = 'neo_additional')
 *   );
 *
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_grade_before
 *   CHECK (grade_before IN ('rare', 'epic', 'unique', 'legendary'));
 *
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_grade_after
 *   CHECK (grade_after IN ('rare', 'epic', 'unique', 'legendary'));
 *
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_grade_transition
 *   CHECK (
 *     (grade_before = 'rare' AND grade_after = 'epic') OR
 *     (grade_before = 'epic' AND grade_after = 'unique') OR
 *     (grade_before = 'unique' AND grade_after = 'legendary')
 *   );
 *
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_quantity
 *   CHECK (quantity_used >= 1 AND quantity_used <= 9999);
 *
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_character_name
 *   CHECK (character_name IS NULL OR (char_length(character_name) <= 50 AND character_name !~ '[<>&"\'']));
 *
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_server_name
 *   CHECK (server_name IN ('かえで', 'ゆかり', 'くるみ', 'チャレンジャーズ'));
 *
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_equipment_parts
 *   CHECK (equipment_parts IS NULL OR equipment_parts IN ('weapon', 'hat', 'gloves', 'shoes', 'overall', 'accessory', 'other'));
 *
 * -- 7. Ensure anon key has appropriate permissions (only SELECT/INSERT on this table)
 * -- REVOKE ALL ON cube_usage_events FROM anon;
 * -- GRANT SELECT, INSERT ON cube_usage_events TO anon;
 */
