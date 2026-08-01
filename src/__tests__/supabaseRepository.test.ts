// capture-app/src/__tests__/supabaseRepository.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ManualEntryRecord } from "@/types";
import type { IRecordRepository } from "@/data/recordRepository";

/**
 * Supabase のクライアントインターフェース（モック用）。
 * 本来は @supabase/supabase-js の型をインポートしますが、テストだけのため簡易定義です。
 */
interface SupabaseClient {
  from<T>(table: string): {
    select(): Promise<{ data: T[]; error: null | Error }>;
    insert(values: T[]): Promise<{ data: T[]; error: null | Error }>;
    update(values: Partial<T>): {
      eq(column: keyof T, value: unknown): Promise<{ data: T[]; error: null | Error }>;
    };
    delete(): {
      eq(column: keyof T, value: unknown): Promise<{ data: null; error: null | Error }>;
    };
  };
}

/**
 * SupabaseRecordRepository のモック実装。
 * 実装側はまだ存在しませんが、テストでは以下のようにインスタンス化できることを想定しています。
 */
class SupabaseRecordRepository implements IRecordRepository {
  private client: SupabaseClient;
  private readonly TABLE = "cube_usage";

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // 旧インターフェースは未実装のまま（テストでは使用しません）
  getAll(): ManualEntryRecord[] { throw new Error("Not implemented"); }
  getById(): ManualEntryRecord | undefined { throw new Error("Not implemented"); }
  add(): ManualEntryRecord { throw new Error("Not implemented"); }
  update(): ManualEntryRecord { throw new Error("Not implemented"); }
  delete(): boolean { throw new Error("Not implemented"); }
  count(): number { throw new Error("Not implemented"); }

  // ---------- 非同期 CRUD ----------
  async getAllAsync(): Promise<ManualEntryRecord[]> {
    const { data, error } = await this.client.from<ManualEntryRecord>(this.TABLE).select();
    if (error) throw error;
    return data;
  }

  async addAsync(record: Omit<ManualEntryRecord, "id">): Promise<ManualEntryRecord> {
    const { data, error } = await this.client
      .from<ManualEntryRecord>(this.TABLE)
      .insert([{ ...record } as ManualEntryRecord]);
    if (error) throw error;
    return data[0];
  }

  async updateAsync(
    id: number,
    patch: Partial<Omit<ManualEntryRecord, "id">>,
  ): Promise<ManualEntryRecord> {
    const { data, error } = await this.client
      .from<ManualEntryRecord>(this.TABLE)
      .update(patch)
      .eq("id", id);
    if (error) throw error;
    return data[0];
  }

  async deleteAsync(id: number): Promise<boolean> {
    const { error } = await this.client
      .from<ManualEntryRecord>(this.TABLE)
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  }
}

describe("SupabaseRecordRepository (TDD)", () => {
  let client: SupabaseClient;
  let repo: SupabaseRecordRepository;

  beforeEach(() => {
    client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn().mockReturnValue({
          eq: vi.fn(),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn(),
        }),
      }),
    } as unknown as SupabaseClient;
    repo = new SupabaseRecordRepository(client);
  });

  // ---------- CRUD ----------

  it("getAllAsync が失敗したらエラーがスローされる", async () => {
    // @ts-expect-error: mock の構造を SupabaseClient にキャスト: mock の構造を合わせる
    client.from.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ data: [], error: new Error("network") }),
    });
    await expect(repo.getAllAsync()).rejects.toThrow("network");
  });

  it("addAsync が成功したら id が付与されたレコードが返る", async () => {
    const input = {
      server_name: "かえで",
      potential_type: "potential" as const,
      cube_type: "neo" as const,
      grade_before: "rare" as const,
      grade_after: "epic" as const,
      quantity_used: 3,
      is_miracle_time: false,
      character_name: null,
      timestamp: Date.now(),
    };
    // @ts-expect-error: mock の構造を SupabaseClient にキャスト
    client.from.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ data: [{ ...input, id: 42 }], error: null }),
    });
    const saved = await repo.addAsync(input);
    expect(saved.id).toBe(42);
    expect(saved.quantity_used).toBe(3);
  });

  it("addAsync がエラーを返すと例外になる", async () => {
    // @ts-expect-error: mock の構造を SupabaseClient にキャスト
    client.from.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ data: [], error: new Error("unauthorized") }),
    });
    const input = {
      server_name: "かえで",
      potential_type: "potential" as const,
      cube_type: "neo" as const,
      grade_before: "rare" as const,
      grade_after: "epic" as const,
      quantity_used: 1,
      is_miracle_time: false,
      character_name: null,
      timestamp: Date.now(),
    };
    await expect(repo.addAsync(input)).rejects.toThrow("unauthorized");
  });

  it("updateAsync が成功すれば更新後のレコードが返る", async () => {
    const updated = {
      id: 5,
      server_name: "ゆかり",
      potential_type: "additional_potential" as const,
      cube_type: "neo_additional" as const,
      grade_before: "unique" as const,
      grade_after: "legendary" as const,
      quantity_used: 10,
      is_miracle_time: true,
      character_name: "さくら",
      timestamp: Date.now(),
    };
    // @ts-expect-error: mock の構造を SupabaseClient にキャスト
    client.from.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [updated], error: null }),
      }),
    });
    const result = await repo.updateAsync(5, { quantity_used: 10 });
    expect(result.quantity_used).toBe(10);
    expect(result.server_name).toBe("ゆかり");
  });

  it("updateAsync がエラーの場合は例外がスローされる", async () => {
    // @ts-expect-error: mock の構造を SupabaseClient にキャスト
    client.from.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: new Error("conflict") }),
      }),
    });
    await expect(repo.updateAsync(99, { quantity_used: 5 })).rejects.toThrow("conflict");
  });

  it("deleteAsync が成功すれば true が返る", async () => {
    // @ts-expect-error: mock の構造を SupabaseClient にキャスト
    client.from.mockReturnValueOnce({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    const ok = await repo.deleteAsync(3);
    expect(ok).toBe(true);
  });

  it("deleteAsync がエラーを返すと例外になる", async () => {
    // @ts-expect-error: mock の構造を SupabaseClient にキャスト
    client.from.mockReturnValueOnce({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: new Error("network") }),
      }),
    });
    await expect(repo.deleteAsync(1)).rejects.toThrow("network");
  });
});
