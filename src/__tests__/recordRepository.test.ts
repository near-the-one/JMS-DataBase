import { describe, it, expect, beforeEach } from "vitest";
import {
  createRecordRepository,
  type IRecordRepository,
} from "@/data/recordRepository";
import type { ManualEntryRecord } from "@/types";

describe("Phase1: Repository（InMemoryRecordRepository）", () => {
  let repo: IRecordRepository;

  const validRecord = (
    overrides?: Partial<Omit<ManualEntryRecord, "id">>,
  ): Omit<ManualEntryRecord, "id"> => ({
    server_name: "かえで",
    potential_type: "potential",
    cube_type: "neo",
    grade_before: "rare",
    grade_after: "epic",
    quantity_used: 1,
    is_miracle_time: false,
    character_name: null,
    timestamp: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    repo = createRecordRepository();
  });

  describe("初期状態", () => {
    it("初期状態で getAll() が空配列を返すこと", async () => {
      expect(await repo.getAll()).toHaveLength(0);
    });

    it("初期状態で count() が 0 を返すこと", async () => {
      expect(await repo.count()).toBe(0);
    });

    it("初期状態で getById(1) が undefined を返すこと", async () => {
      expect(await repo.getById(1)).toBeUndefined();
    });
  });

  describe("add（登録）", () => {
    it("1件登録すると count() が 1 になること", async () => {
      await repo.add(validRecord());
      expect(await repo.count()).toBe(1);
    });

    it("登録されたレコードに id が自動付与されること", async () => {
      const rec = await repo.add(validRecord());
      expect(typeof rec.id).toBe("number");
      expect(rec.id).toBeGreaterThanOrEqual(1);
    });

    it("add の戻り値が入力値を含むこと", async () => {
      const rec = await repo.add(validRecord({ quantity_used: 5 }));
      expect(rec.quantity_used).toBe(5);
      expect(rec.server_name).toBe("かえで");
    });

    it("add すると getAll() で1件返ってくること", async () => {
      await repo.add(validRecord());
      expect(await repo.getAll()).toHaveLength(1);
    });

    it("複数件登録できること", async () => {
      await repo.add(validRecord());
      await repo.add(validRecord({ cube_type: "mega" }));
      await repo.add(validRecord({ cube_type: "neo_additional" }));
      expect(await repo.count()).toBe(3);
    });

    it("id が1ずつインクリメントされること", async () => {
      const r1 = await repo.add(validRecord());
      const r2 = await repo.add(validRecord());
      expect(r2.id).toBe(r1.id + 1);
    });

    it("登録したレコードは元の入力値を変更しないこと（immutable）", async () => {
      const input = validRecord({ quantity_used: 99 });
      await repo.add(input);
      expect(input.quantity_used).toBe(99);
      expect((input as ManualEntryRecord).id).toBeUndefined();
    });
  });

  describe("getById", () => {
    it("存在する id のレコードを取得できること", async () => {
      const rec = await repo.add(validRecord());
      const found = await repo.getById(rec.id);
      expect(found).toBeDefined();
      expect(found!.cube_type).toBe("neo");
    });

    it("存在しない id の場合は undefined を返すこと", async () => {
      expect(await repo.getById(999)).toBeUndefined();
    });
  });

  describe("delete（削除）", () => {
    it("存在するレコードを削除すると count() が減ること", async () => {
      const rec = await repo.add(validRecord());
      expect(await repo.count()).toBe(1);
      await repo.delete(rec.id);
      expect(await repo.count()).toBe(0);
    });

    it("存在する id の削除は true を返すこと", async () => {
      const rec = await repo.add(validRecord());
      expect(await repo.delete(rec.id)).toBe(true);
    });

    it("存在しない id の削除は false を返すこと", async () => {
      expect(await repo.delete(999)).toBe(false);
    });

    it("削除後は getById で undefined が返ること", async () => {
      const rec = await repo.add(validRecord());
      await repo.delete(rec.id);
      expect(await repo.getById(rec.id)).toBeUndefined();
    });
  });

  describe("update（編集）", () => {
    it("quantity_used を更新できること", async () => {
      const rec = await repo.add(validRecord({ quantity_used: 1 }));
      await repo.update(rec.id, validRecord({ quantity_used: 10 }));
      const updated = (await repo.getById(rec.id))!;
      expect(updated.quantity_used).toBe(10);
    });

    it("server_name を更新できること", async () => {
      const rec = await repo.add(validRecord({ server_name: "かえで" }));
      await repo.update(rec.id, validRecord({ server_name: "ゆかり" }));
      const updated = (await repo.getById(rec.id))!;
      expect(updated.server_name).toBe("ゆかり");
    });

    it("grade_after を更新できること", async () => {
      const rec = await repo.add(
        validRecord({ grade_before: "rare", grade_after: "epic" }),
      );
      await repo.update(rec.id, validRecord({ grade_after: "unique" }));
      const updated = (await repo.getById(rec.id))!;
      expect(updated.grade_after).toBe("unique");
    });

    it("is_miracle_time を更新できること", async () => {
      const rec = await repo.add(validRecord({ is_miracle_time: false }));
      await repo.update(rec.id, validRecord({ is_miracle_time: true }));
      const updated = (await repo.getById(rec.id))!;
      expect(updated.is_miracle_time).toBe(true);
    });

    it("一部のフィールドのみ更新可能なこと（他のフィールドは維持される）", async () => {
      const rec = await repo.add(
        validRecord({
          server_name: "くるみ",
          cube_type: "mega",
          quantity_used: 3,
          is_miracle_time: false,
        }),
      );
      await repo.update(rec.id, validRecord({
        quantity_used: 99,
        server_name: "くるみ",
        cube_type: "mega",
        is_miracle_time: false,
      }));
      const updated = (await repo.getById(rec.id))!;
      expect(updated.quantity_used).toBe(99);
      // 他は維持
      expect(updated.server_name).toBe("くるみ");
      expect(updated.cube_type).toBe("mega");
      expect(updated.is_miracle_time).toBe(false);
    });

    it("存在しない id の update でエラーがスローされること", async () => {
      await expect(
        repo.update(999, validRecord({ quantity_used: 10 })),
      ).rejects.toThrow();
    });
  });

  describe("一覧（getAll）", () => {
    it("getAll() は内部配列のコピーを返し、直接変更できないこと", async () => {
      await repo.add(validRecord());
      const list1 = await repo.getAll();
      list1.pop();
      expect(await repo.count()).toBe(1);
    });

    it("全件取得できること", async () => {
      await repo.add(validRecord({ server_name: "かえで" }));
      await repo.add(validRecord({ server_name: "ゆかり" }));
      await repo.add(validRecord({ server_name: "くるみ" }));
      const all = await repo.getAll();
      expect(all).toHaveLength(3);
    });
  });
});