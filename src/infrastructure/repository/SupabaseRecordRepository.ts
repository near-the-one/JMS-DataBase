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
 * timestamp カラムは tz なしの `timestamp` 型で、JSTの値をそのまま(オフセット無しで)保存する設計。
 * epoch(ms) から JST の生の日時文字列を作る。
 */
function toJstNaiveTimestamp(epochMs: number): string {
  const d = new Date(epochMs + 9 * 60 * 60 * 1000); // JSTの数字を取り出すためのシフト
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/**
 * DBの timestamp (JSTのnaive文字列 or 既にオフセット付き) を epoch(ms) に変換する。
 */
function fromJstNaiveTimestamp(value: string): number {
  const hasOffset = /[Zz]|[+-]\d{2}:?\d{2}$/.test(value);
  const iso = hasOffset ? value : `${value.replace(" ", "T")}+09:00`;
  return new Date(iso).getTime();
}

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
function validateRecord(record: Omit<ManualEntryRecord, "id">): void {
  // Validate server_name (optional - can be null/empty)
  if (record.server_name && record.server_name.length > MAX_SERVER_NAME_LENGTH) {
    throw new Error(`server_name exceeds max length of ${MAX_SERVER_NAME_LENGTH}`);
  }
  // Server name should be one of the known values (validated by UI, but enforce here too)
  // Allow null/empty since it's optional
  const validServers = ["かえで", "ゆかり", "くるみ", "チャレンジャーズ"];
  if (record.server_name && !validServers.includes(record.server_name)) {
    throw new Error(`Invalid server_name: ${record.server_name}`);
  }

  // Validate potential_type
  if (!["potential", "additional_potential"].includes(record.potential_type)) {
    throw new Error(`Invalid potential_type: ${record.potential_type}`);
  }

  // Validate cube_type against potential_type
  const allowedCubes = ALLOWED_CUBE_TYPES[record.potential_type];
  if (!allowedCubes || !allowedCubes.has(record.cube_type!)) {
    throw new Error(`Invalid combination: ${record.potential_type} - ${record.cube_type}`);
  }

  // Validate grade_before (等級遷移は grade_before から自動的に決まる。legendaryは挑戦対象になり得ない)
  const gradeBefore = record.grade_before;
  if (!GRADE_ORDER.includes(gradeBefore) || GRADE_ORDER.indexOf(gradeBefore) >= GRADE_ORDER.length - 1) {
    throw new Error(`Invalid grade_before: ${gradeBefore}`);
  }

  // Validate result (success/fail)。失敗データも母数に含めるための必須フィールド
  if (record.result !== "success" && record.result !== "fail") {
    throw new Error(`Invalid result: ${record.result}. Must be "success" or "fail".`);
  }

  // grade_after は result==="success" のときだけ意味を持つ（fail の場合は変化なし）。
  // 送られてきている場合は、grade_before の次の等級と一致しているか整合性チェックする。
  const expectedAfter = GRADE_ORDER[GRADE_ORDER.indexOf(gradeBefore) + 1];
  if (record.result === "success" && record.grade_after && record.grade_after !== expectedAfter) {
    throw new Error(`Invalid grade_after: ${record.grade_after}. Expected ${expectedAfter} for grade_before=${gradeBefore}.`);
  }

  // Validate quantity_used
  const qty = Number(record.quantity_used);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
    throw new Error(`quantity_used must be an integer between 1 and ${MAX_QUANTITY}`);
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

  // Validate created_at
  if (record.created_at !== undefined) {
    const ts = Number(record.created_at);
    if (!Number.isInteger(ts) || ts < 0 || ts > Date.now() + 86400000) { // allow 1 day future for clock skew
      throw new Error("Invalid created_at");
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
    // Convert created_at (Postgres created_attz) to number (ms since epoch)
    const created_at = row.created_at ? new Date(row.created_at).getTime() : Date.now();
    // Determine grade_before and grade_after. grade_transition (1-3) determines grade_before;
    // grade_after is only meaningful when result === "success".
    let gradeBefore: Grade = "rare";
    let gradeAfter: Grade | null = null;
    const result: "success" | "fail" = row.result === "success" ? "success" : "fail";
    if (row.grade_transition) {
      const transition = Number(row.grade_transition);
      const gradeMap: Record<number, Grade> = {
        1: "rare",
        2: "epic",
        3: "unique",
      } as const;
      gradeBefore = gradeMap[transition] ?? "rare";
      if (result === "success") {
        const idx = GRADE_ORDER.indexOf(gradeBefore);
        gradeAfter = GRADE_ORDER[idx + 1] ?? null;
      }
    }
    // timestamp（使用日時・JST naive）を epoch(ms) に変換。無ければ created_at で代替。
    const timestamp = row.timestamp ? fromJstNaiveTimestamp(row.timestamp) : created_at;

    return {
      id,
      server_name: row.server_name ?? "",
      potential_type: row.potential_type,
      cube_type: row.cube_type,
      grade_before: gradeBefore,
      grade_after: gradeAfter,
      result,
      quantity_used: row.quantity_used,
      character_name: row.character_name ?? null,
      timestamp,
      created_at,
      part: row.part ?? undefined,
      // optional fields not stored in DB are omitted
    } as ManualEntryRecord;
  }

  async getAll(): Promise<ManualEntryRecord[]> {
    const { data, error } = await this.client
      .from("cube_usage_events")
      .select("id,timestamp,server_name,potential_type,cube_type,grade_transition,result,quantity_used,character_name,created_at,part");
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
    return this.mapDbRow(data);
  }

  async add(record: Omit<ManualEntryRecord, "id">): Promise<ManualEntryRecord> {
    // SERVER-SIDE VALIDATION (defense in depth - primary enforcement is DB constraints)
    validateRecord(record);

    // grade_transition (1-3) は grade_before だけで決まる（rare=1, epic=2, unique=3）。
    // 遷移は常に隣接1段のみなので、成功/失敗どちらの記録でも同じ値になる。
    const gradeTransition = GRADE_ORDER.indexOf(record.grade_before) + 1;

    // Sanitize character_name
    const sanitizedCharacterName = record.character_name ? sanitizeInput(record.character_name) : null;

    // Omit grade_before/grade_after (DBはgrade_transitionのみ) と created_at (DB側で自動生成される列。
    // クライアントのepoch数値をそのまま送ると "date/time field value out of range" になる)
    const { grade_before: _gradeBefore, grade_after: _gradeAfter, created_at: _createdAt, ...recordWithoutGrades } = record;
    const dbRecord = {
      ...recordWithoutGrades,
      character_name: sanitizedCharacterName,
      grade_transition: gradeTransition,
      result: record.result,
      // timestamp カラムは tz なし。JSTの生の日時をそのまま保存する。
      timestamp: toJstNaiveTimestamp(record.timestamp),
    };

    const { data, error } = await this.client
      .from("cube_usage_events")
      .insert([dbRecord])
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

  async getLatestTimestamp(): Promise<number> {
    // Fetch all created_ats and compute the latest locally to avoid TypeScript typing issues
    const { data, error } = await this.client
      .from('cube_usage_events')
      .select('created_at');
    if (error) throw error;
    const rows = (data || []) as any[];
    if (rows.length === 0) return Date.now();
    const latest = rows.reduce((max, r) => {
      const ts = new Date(r.created_at).getTime();
      return ts > max ? ts : max;
    }, 0);
    return latest;
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
    // 1. キューブ使用イベント取得（判定対象の timestamp 列を必ず含める）
    const { data: events, error: evErr } = await this.client
      .from("cube_usage_events")
      .select("id,server_name,potential_type,cube_type,grade_transition,result,quantity_used,character_name,timestamp,created_at,part");
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

    // 3. 判定ヘルパー（timestamp / miracle_time_schedules は両方とも JST naive で格納されている想定）
    // fromJstNaiveTimestamp はファイル冒頭で定義済みの共通関数を再利用する（重複ロジックの整理）
    const isInMiracle = (ts: string | null | undefined) => {
      if (!ts) return false;
      const time = fromJstNaiveTimestamp(ts);
      return scheduleRows.some(s => {
        const start = fromJstNaiveTimestamp(s.start);
        const end = fromJstNaiveTimestamp(s.end);
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
      // Skip records with invalid potential/cube combination (data cleanup needed in DB)
      const allowedCubes = ALLOWED_CUBE_TYPES[r.potential_type];
      if (!allowedCubes || !allowedCubes.has(r.cube_type)) {
        // This indicates data inconsistency - the DB constraints should prevent this
        // Log for debugging but skip processing to avoid errors
        console.warn(`Invalid combination in DB: ${r.potential_type} - ${r.cube_type} (should be handled by DB constraints)`);
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
      // 分母(total_quantity)は成功/失敗を問わず全ての使用個数を合算する（生存バイアス対策）。
      agg.total_quantity += Number(r.quantity_used) || 0;
      // 分子(count)は「上昇した」記録のみカウントする。
      if (r.result === "success") {
        agg.count += 1;
      }
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
        // supply_rate = 昇級率 (%) = 成功回数 / 使用個数(成功+失敗の合計) * 100
        // 失敗記録も total_quantity に含まれるため、生存バイアスのない実測値になる
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
 * -- 4. Allow anonymous DELETE (if needed, with caution)
 * -- CREATE POLICY "Allow delete" ON cube_usage_events
 * --   FOR DELETE USING (auth.uid() = user_id);
 *
 * -- 5. CHECK constraints for data integrity (run these in Supabase SQL Editor)
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_potential_type
 *   CHECK (potential_type IN ('potential', 'additional_potential'));
 *
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_cube_type
 *   CHECK (
 *     (potential_type = 'potential' AND cube_type IN ('neo', 'mega')) OR
 *     (potential_type = 'additional_potential' AND cube_type = 'neo_additional')
 *   );
 *
 * -- NOTE: このアプリは grade_before/grade_after をDBへ送信しない設計（add/updateで明示的にomitしている）。
 * -- 実際に保存されるのは grade_transition (1=rare→epic, 2=epic→unique, 3=unique→legendary) と
 * -- result ('success'|'fail') の組み合わせ。grade_after は result==='success' のときのみ意味を持ち、
 * -- クライアント側で grade_transition から動的に導出する（DBには保存しない）。
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_grade_transition
 *   CHECK (grade_transition IN (1, 2, 3));
 *
 * -- result 列: 失敗データも記録できるようにするための必須列（生存バイアス対策）
 * -- 既存データ移行時は、旧スキーマの全レコードが「成功」だった前提で result='success' をデフォルト値とする。
 * ALTER TABLE cube_usage_events ADD COLUMN result TEXT NOT NULL DEFAULT 'success';
 * ALTER TABLE cube_usage_events ADD CONSTRAINT valid_result
 *   CHECK (result IN ('success', 'fail'));
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
 * -- 6. Ensure anon key has appropriate permissions (only SELECT/INSERT on this table)
 * -- REVOKE ALL ON cube_usage_events FROM anon;
 * -- GRANT SELECT, INSERT ON cube_usage_events TO anon;
 */