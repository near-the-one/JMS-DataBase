/**
 * Phase 1: 非同期リポジトリインターフェースのテスト
 *
 * IRecordRepository の全メソッドが Promise を返す非同期シグネチャであることを検証する。
 * 実装は未実装（テストファースト）のため、モックで型の互換性を確認する。
 */
import { describe, it, expect } from "vitest";
import type { ManualEntryRecord, ServerName, PotentialType, CubeType, Grade } from "@/types";

/** Phase 1 で期待される非同期リポジトリインターフェース */
interface IAsyncRecordRepository {
  getAll(): Promise<ManualEntryRecord[]>;
  getById(id: number): Promise<ManualEntryRecord | undefined>;
  add(record: Omit<ManualEntryRecord, "id">): Promise<ManualEntryRecord>;
  update(
    id: number,
    record: Partial<Omit<ManualEntryRecord, "id">>,
  ): Promise<ManualEntryRecord>;
  delete(id: number): Promise<boolean>;
  count(): Promise<number>;
}

/** 非同期 InMemory 実装の型を満たすダミー（実際の実装は未実装のためスタブ） */
class InMemoryAsyncRepo implements IAsyncRecordRepository {
  private records: ManualEntryRecord[] = [];
  private nextId = 1;

  async getAll(): Promise<ManualEntryRecord[]> {
    return [...this.records];
  }

  async getById(id: number): Promise<ManualEntryRecord | undefined> {
    return this.records.find((r) => r.id === id);
  }

  async add(record: Omit<ManualEntryRecord, "id">): Promise<ManualEntryRecord> {
    const rec: ManualEntryRecord = { id: this.nextId++, ...record };
    this.records.push(rec);
    return rec;
  }

  async update(
    id: number,
    record: Partial<Omit<ManualEntryRecord, "id">>,
  ): Promise<ManualEntryRecord> {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Record not found: id=${id}`);
    this.records[idx] = { ...this.records[idx], ...record } as ManualEntryRecord;
    return this.records[idx];
  }

  async delete(id: number): Promise<boolean> {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.records.splice(idx, 1);
    return true;
  }

  async count(): Promise<number> {
    return this.records.length;
  }
}

const validRecord = (
  overrides?: Partial<Omit<ManualEntryRecord, "id">>,
): Omit<ManualEntryRecord, "id"> => ({
  server_name: "かえで" as ServerName,
  potential_type: "potential" as PotentialType,
  cube_type: "neo" as CubeType,
  grade_before: "rare",
  grade_after: "epic",
  quantity_used: 1,
  is_miracle_time: false,
  character_name: null,
  timestamp: Date.now(),
  ...overrides,
});

describe("Phase1: 非同期 IRecordRepository", () => {
  describe("インターフェース型検証", () => {
    it("getAll() が Promise<ManualEntryRecord[]> を返すこと", () => {
      const repo = new InMemoryAsyncRepo();
      const result = repo.getAll();
      expect(result).toBeInstanceOf(Promise);
    });

    it("getById(id) が Promise<ManualEntryRecord | undefined> を返すこと", () => {
      const repo = new InMemoryAsyncRepo();
      const result = repo.getById(1);
      expect(result).toBeInstanceOf(Promise);
    });

    it("add(record) が Promise<ManualEntryRecord> を返すこと", () => {
      const repo = new InMemoryAsyncRepo();
      const result = repo.add(validRecord());
      expect(result).toBeInstanceOf(Promise);
    });

    it("update(id, record) が Promise<ManualEntryRecord> を返すこと", () => {
      const repo = new InMemoryAsyncRepo();
      return expect(repo.update(1, validRecord())).rejects.toThrow();
    });

    it("delete(id) が Promise<boolean> を返すこと", () => {
      const repo = new InMemoryAsyncRepo();
      const result = repo.delete(1);
      expect(result).toBeInstanceOf(Promise);
    });

    it("count() が Promise<number> を返すこと", () => {
      const repo = new InMemoryAsyncRepo();
      const result = repo.count();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("初期状態（非同期）", () => {
    it("初期状態で getAll() が空配列を返すこと", async () => {
      const repo = new InMemoryAsyncRepo();
      const all = await repo.getAll();
      expect(all).toHaveLength(0);
    });

    it("初期状態で count() が 0 を返すこと", async () => {
      const repo = new InMemoryAsyncRepo();
      expect(await repo.count()).toBe(0);
    });

    it("初期状態で getById(1) が undefined を返すこと", async () => {
      const repo = new InMemoryAsyncRepo();
      expect(await repo.getById(1)).toBeUndefined();
    });
  });

  describe("非同期 CRUD", () => {
    it("add → getAll が非同期で連鎖的に動作すること", async () => {
      const repo = new InMemoryAsyncRepo();
      await repo.add(validRecord());
      const all = await repo.getAll();
      expect(all).toHaveLength(1);
    });

    it("add の戻り値が自動付与された id を含むこと", async () => {
      const repo = new InMemoryAsyncRepo();
      const rec = await repo.add(validRecord());
      expect(typeof rec.id).toBe("number");
      expect(rec.id).toBeGreaterThanOrEqual(1);
    });

    it("複数件の非同期追加が正しく動作すること", async () => {
      const repo = new InMemoryAsyncRepo();
      await repo.add(validRecord());
      await repo.add(validRecord({ cube_type: "mega" }));
      await repo.add(validRecord({ cube_type: "neo_additional" }));
      expect(await repo.count()).toBe(3);
    });

    it("add が入力のコピーを保持すること", async () => {
      const repo = new InMemoryAsyncRepo();
      const rec = await repo.add(validRecord({ quantity_used: 42 }));
      expect(rec.quantity_used).toBe(42);
      expect(rec.server_name).toBe("かえで");
    });

    it("id が 1 ずつ一貫して増加すること", async () => {
      const repo = new InMemoryAsyncRepo();
      const r1 = await repo.add(validRecord());
      const r2 = await repo.add(validRecord());
      expect(r2.id).toBe(r1.id + 1);
    });
  });

  describe("非同期 getById", () => {
    it("存在する id のレコードを非同期で取得できること", async () => {
      const repo = new InMemoryAsyncRepo();
      const rec = await repo.add(validRecord());
      const found = await repo.getById(rec.id);
      expect(found).toBeDefined();
      expect(found!.cube_type).toBe("neo");
    });

    it("存在しない id の場合は undefined を返すこと", async () => {
      const repo = new InMemoryAsyncRepo();
      expect(await repo.getById(999)).toBeUndefined();
    });
  });

  describe("非同期削除", () => {
    it("存在するレコードを非同期で削除した後 count が減ること", async () => {
      const repo = new InMemoryAsyncRepo();
      const rec = await repo.add(validRecord());
      expect(await repo.count()).toBe(1);
      await repo.delete(rec.id);
      expect(await repo.count()).toBe(0);
    });

    it("存在する id の削除は Promise<true> を返すこと", async () => {
      const repo = new InMemoryAsyncRepo();
      const rec = await repo.add(validRecord());
      expect(await repo.delete(rec.id)).toBe(true);
    });

    it("存在しない id の削除は Promise<false> を返すこと", async () => {
      const repo = new InMemoryAsyncRepo();
      expect(await repo.delete(999)).toBe(false);
    });

    it("削除後は getById で undefined が返ること", async () => {
      const repo = new InMemoryAsyncRepo();
      const rec = await repo.add(validRecord());
      await repo.delete(rec.id);
      expect(await repo.getById(rec.id)).toBeUndefined();
    });
  });

  describe("非同期 update", () => {
    it("quantity_used を非同期で更新できること", async () => {
      const repo = new InMemoryAsyncRepo();
      const rec = await repo.add(validRecord({ quantity_used: 1 }));
      await repo.update(rec.id, validRecord({ quantity_used: 10 }));
      const updated = (await repo.getById(rec.id))!;
      expect(updated.quantity_used).toBe(10);
    });

    it("server_name を非同期で更新できること", async () => {
      const repo = new InMemoryAsyncRepo();
      const rec = await repo.add(validRecord({ server_name: "かえで" }));
      await repo.update(rec.id, validRecord({ server_name: "ゆかり" }));
      const updated = (await repo.getById(rec.id))!;
      expect(updated.server_name).toBe("ゆかり");
    });

    it("is_miracle_time を非同期で切り替えられること", async () => {
      const repo = new InMemoryAsyncRepo();
      const rec = await repo.add(validRecord({ is_miracle_time: false }));
      await repo.update(rec.id, validRecord({ is_miracle_time: true }));
      const updated = (await repo.getById(rec.id))!;
      expect(updated.is_miracle_time).toBe(true);
    });

    it("Phase 1: 一部のフィールドのみ非同期更新可能でその他は維持されること", async () => {
      const repo = new InMemoryAsyncRepo();
      const rec = await repo.add(
        validRecord({
          server_name: "くるみ",
          cube_type: "mega",
          quantity_used: 3,
          is_miracle_time: false,
        }),
      );
      // 部分更新: quantity_used のみ指定
      await repo.update(rec.id, { quantity_used: 99 });
      const updated = (await repo.getById(rec.id))!;
      expect(updated.quantity_used).toBe(99);
      // 元の他フィールドが維持されている
      expect(updated.server_name).toBe("くるみ");
      expect(updated.cube_type).toBe("mega");
      expect(updated.is_miracle_time).toBe(false);
    });

    it("存在しない id の更新はエラーがスローされること", async () => {
      const repo = new InMemoryAsyncRepo();
      await expect(
        repo.update(999, validRecord({ quantity_used: 10 })),
      ).rejects.toThrow();
    });
  });

  describe("非同期一覧取得", () => {
    it("非同期 getAll() が内部配列のコピーを返すこと", async () => {
      const repo = new InMemoryRecordRepository();
      await repo.add(validRecord());
      const list1 = await repo.getAll();
      list1.pop();
      expect(await repo.count()).toBe(1);
    });

    it("全件を非同期で取得できること", async () => {
      const repo = new InMemoryRecordRepository();
      await repo.add(validRecord({ server_name: "かえで" }));
      await repo.add(validRecord({ server_name: "ゆかり" }));
      await repo.add(validRecord({ server_name: "くるみ" }));
      const all = await repo.getAll();
      expect(all).toHaveLength(3);
    });
  });

  describe("part と usedAt の非同期保存", () => {
    it("part フィールドを保存し、getById で読み戻せること", async () => {
      const repo = new InMemoryRecordRepository();
      const rec = await repo.add(validRecord({ part: "weapon" }));
      const found = (await repo.getById(rec.id))!;
      expect(found.part).toBe("weapon");
    });

    it("usedAt フィールドを保存し、getById で読み戻せること", async () => {
      const repo = new InMemoryRecordRepository();
      const rec = await repo.add(validRecord({ usedAt: "2026/07/29 12:00" }));
      const found = (await repo.getById(rec.id))!;
      expect(found.usedAt).toBe("2026/07/29 12:00");
    });

    it("part 省略時は undefined になること", async () => {
      const repo = new InMemoryRecordRepository();
      const rec = await repo.add(validRecord());
      const found = (await repo.getById(rec.id))!;
      expect(found.part).toBeUndefined();
    });

    it("usedAt 省略時は undefined になること", async () => {
      const repo = new InMemoryRecordRepository();
      const rec = await repo.add(validRecord());
      const found = (await repo.getById(rec.id))!;
      expect(found.usedAt).toBeUndefined();
    });
  });
});