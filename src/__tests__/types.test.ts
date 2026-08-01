import { describe, it, expect } from "vitest";
import {
  GRADE_ORDER,
  GRADE_LABELS,
  SERVER_NAMES,
} from "@/types";
import type {
  CubeUsageRecord,
  AggregatedStat,
  ManualEntryRecord,
  ServerName,
  PotentialType,
  CubeType,
  Grade,
} from "@/types";

describe("types", () => {
  describe("GRADE_ORDER", () => {
    it("昇級順が レア → エピック → ユニーク → レジェンダリー であること", () => {
      expect(GRADE_ORDER).toEqual(["rare", "epic", "unique", "legendary"]);
    });

    it("4つの等級が定義されていること", () => {
      expect(GRADE_ORDER).toHaveLength(4);
    });
  });

  describe("GRADE_LABELS", () => {
    it("すべての等級に日本語ラベルが定義されていること", () => {
      expect(GRADE_LABELS.rare).toBe("レア");
      expect(GRADE_LABELS.epic).toBe("エピック");
      expect(GRADE_LABELS.unique).toBe("ユニーク");
      expect(GRADE_LABELS.legendary).toBe("レジェンダリー");
    });
  });

  describe("SERVER_NAMES", () => {
    it("4種類のサーバーが定義されていること", () => {
      expect(SERVER_NAMES).toHaveLength(4);
    });

    it("かえで・ゆかり・くるみ・チャレンジャーズが含まれていること", () => {
      expect(SERVER_NAMES).toContain("かえで");
      expect(SERVER_NAMES).toContain("ゆかり");
      expect(SERVER_NAMES).toContain("くるみ");
      expect(SERVER_NAMES).toContain("チャレンジャーズ");
    });
  });

  describe("CubeUsageRecord 型の互換性", () => {
    it("Supabase 互換のフィールドを持つこと", () => {
      const record: CubeUsageRecord = {
        id: "test-1",
        date: "2026-01-01",
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 1,
        upgraded: true,
        is_miracle_time: false,
      };
      expect(record.id).toBe("test-1");
      expect(record.is_miracle_time).toBe(false);
      // Phase 1: 追加フィールド
      expect(record.potential_type).toBe("potential");
      expect(record.server_name).toBe("かえで");
    });

    it("potential_type は potential または additional_potential であること", () => {
      const record1: CubeUsageRecord = {
        id: 1,
        date: "2026-01-01",
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 1,
        upgraded: false,
        is_miracle_time: false,
      };
      const record2: CubeUsageRecord = {
        id: 2,
        date: "2026-01-01",
        server_name: "ゆかり",
        potential_type: "additional_potential",
        cube_type: "neo_additional",
        grade_before: "epic",
        grade_after: "unique",
        quantity_used: 1,
        upgraded: false,
        is_miracle_time: false,
      };
      expect(record1.potential_type).toBe("potential");
      expect(record2.potential_type).toBe("additional_potential");
    });

    it("server_name は4サーバーのいずれかであること", () => {
      const record: CubeUsageRecord = {
        id: 1,
        date: "2026-01-01",
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 1,
        upgraded: false,
        is_miracle_time: false,
      };
      expect(SERVER_NAMES).toContain(record.server_name);
    });

    it("is_miracle_time が boolean として設定できること", () => {
      const normal: CubeUsageRecord = {
        id: 1,
        date: "2026-01-01",
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 1,
        upgraded: false,
        is_miracle_time: false,
      };
      const miracle: CubeUsageRecord = {
        id: 2,
        date: "2026-01-02",
        server_name: "ゆかり",
        potential_type: "additional_potential",
        cube_type: "neo_additional",
        grade_before: "epic",
        grade_after: "unique",
        quantity_used: 5,
        upgraded: true,
        is_miracle_time: true,
      };
      expect(normal.is_miracle_time).toBe(false);
      expect(miracle.is_miracle_time).toBe(true);
    });
  });

  describe("ManualEntryRecord 型の互換性", () => {
    it("Phase 1: 手入力レコードに part と usedAt のオプショナルフィールドがあること", () => {
      const record: ManualEntryRecord = {
        id: 1,
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 5,
        is_miracle_time: false,
        character_name: null,
        timestamp: Date.now(),
        part: "weapon",
        usedAt: "2026/07/29 12:00",
      };
      expect(record.part).toBe("weapon");
      expect(record.usedAt).toBe("2026/07/29 12:00");
    });

    it("part と usedAt が省略可能であること", () => {
      const record: ManualEntryRecord = {
        id: 1,
        server_name: "かねる",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 5,
        is_miracle_time: false,
        character_name: null,
        timestamp: Date.now(),
      };
      expect(record.part).toBeUndefined();
      expect(record.usedAt).toBeUndefined();
    });

    it("part に 武器・帽子・手袋・靴・全身・アクセサリー または other が設定できること", () => {
      const parts = ["weapon", "hat", "gloves", "shoes", "overall", "accessory", "other"];
      for (const part of parts) {
        const record: ManualEntryRecord = {
          id: 1,
          server_name: "かねる",
          potential_type: "potential",
          cube_type: "neo",
          grade_before: "rare",
          grade_after: "epic",
          quantity_used: 1,
          is_miracle_time: false,
          character_name: null,
          timestamp: Date.now(),
          part,
        };
        expect(record.part).toBe(part);
      }
    });
  });

  describe("AggregatedStat 型の互換性", () => {
    it("集計結果が正しいフィールドを持つこと", () => {
      const stat: AggregatedStat = {
        potential_type: "potential",
        cube_type: "neo",
        grade_from: "rare",
        grade_to: "epic",
        normal_count: 100,
        normal_rate: 10.5,
        miracle_count: 50,
        miracle_rate: 25.0,
      };
      expect(stat.normal_count).toBe(100);
      expect(stat.miracle_rate).toBe(25.0);
    });
  });
});