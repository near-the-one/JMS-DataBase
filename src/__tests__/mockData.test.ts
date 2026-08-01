import { describe, it, expect } from "vitest";
import type { CubeUsageRecord } from "@/types";
import {
  MOCK_RECORDS,
  MOCK_AGGREGATED,
  aggregateRecords,
  totalSamples,
} from "@/data/mockData";

describe("mockData", () => {
  describe("MOCK_RECORDS", () => {
    it("十分な数のレコードが存在すること", () => {
      expect(MOCK_RECORDS.length).toBeGreaterThan(50);
    });

    it("すべてのレコードが一意なIDを持つこと", () => {
      const ids = MOCK_RECORDS.map((r) => r.id);
      expect(new Set(ids).size).toBe(MOCK_RECORDS.length);
    });

    it("通常時とミラクルタイム時のレコードが両方含まれていること", () => {
      const hasNormal = MOCK_RECORDS.some((r) => !r.is_miracle_time);
      const hasMiracle = MOCK_RECORDS.some((r) => r.is_miracle_time);
      expect(hasNormal).toBe(true);
      expect(hasMiracle).toBe(true);
    });

    it("昇級成功と昇級失敗の両方のレコードが含まれていること", () => {
      const hasUpgraded = MOCK_RECORDS.some((r) => r.upgraded);
      const hasFailed = MOCK_RECORDS.some((r) => !r.upgraded);
      expect(hasUpgraded).toBe(true);
      expect(hasFailed).toBe(true);
    });

    it.each([
      ["potential", "neo"],
      ["potential", "mega"],
      ["additional_potential", "neo_additional"],
    ] as const)(
      "潜在能力タイプ '%s' - キューブ '%s' の組み合わせが含まれていること",
      (potentialType, cubeType) => {
        const found = MOCK_RECORDS.some(
          (r) =>
            r.potential_type === potentialType && r.cube_type === cubeType,
        );
        expect(found).toBe(true);
      },
    );

    it("すべての等級がデータに含まれていること", () => {
      const allGrades = new Set(
        MOCK_RECORDS.flatMap((r) => [r.grade_before, r.grade_after]),
      );
      for (const grade of ["rare", "epic", "unique", "legendary"]) {
        expect(allGrades.has(grade)).toBe(true);
      }
    });

    it("全レコードがいずれかのサーバーに属していること", () => {
      const validServers = ["かえで", "ゆかり", "くるみ", "チャレンジャーズ"];
      for (const record of MOCK_RECORDS) {
        expect(validServers).toContain(record.server_name);
      }
    });

    it("すべてのサーバーが少なくとも1件のレコードでカバーされていること", () => {
      const covered = new Set(MOCK_RECORDS.map((r) => r.server_name));
      expect(covered.has("かえで")).toBe(true);
      expect(covered.has("ゆかり")).toBe(true);
      expect(covered.has("くるみ")).toBe(true);
      expect(covered.has("チャレンジャーズ")).toBe(true);
    });
  });

  describe("aggregateRecords", () => {
    it("集計結果が空でないこと", () => {
      const stats = aggregateRecords(MOCK_RECORDS);
      expect(stats.length).toBeGreaterThan(0);
    });

    it("各集計行に normal_count と miracle_count が対応すること", () => {
      const stats = aggregateRecords(MOCK_RECORDS);
      for (const stat of stats) {
        expect(stat.normal_count).toBeGreaterThanOrEqual(0);
        expect(stat.miracle_count).toBeGreaterThanOrEqual(0);
      }
    });

    it("ミラクルタイム時の集計がある列は miracle_count >= 1 であること", () => {
      const stats = aggregateRecords(MOCK_RECORDS);
      const miracleStats = stats.filter((s) => s.miracle_count >= 1);
      expect(miracleStats.length).toBeGreaterThan(0);
    });

    it("通常時の集計がある列は normal_count >= 1 であること", () => {
      const stats = aggregateRecords(MOCK_RECORDS);
      const normalStats = stats.filter((s) => s.normal_count >= 1);
      expect(normalStats.length).toBeGreaterThan(0);
    });

    it("集計キー（potential_type + cube_type + grade_from + grade_to）が一意であること", () => {
      const stats = aggregateRecords(MOCK_RECORDS);
      const keys = stats.map(
        (s) => `${s.potential_type}|${s.cube_type}|${s.grade_from}|${s.grade_to}`,
      );
      expect(new Set(keys).size).toBe(stats.length);
    });
  });

  describe("aggregateRecords rate calculation", () => {
    it("normal_count = upgradedレコード数, normal_rate = upgraded/total_cubes(quantity_used sum)", () => {
      const records = [
        {
          id: "t1", date: "2026-01-01", server_name: "かえで",
          potential_type: "potential", cube_type: "neo",
          grade_before: "rare", grade_after: "epic",
          quantity_used: 10, upgraded: true, is_miracle_time: false,
        },
        {
          id: "t2", date: "2026-01-01", server_name: "かえで",
          potential_type: "potential", cube_type: "neo",
          grade_before: "rare", grade_after: "epic",
          quantity_used: 5, upgraded: false, is_miracle_time: false,
        },
        {
          id: "t3", date: "2026-01-01", server_name: "かえで",
          potential_type: "potential", cube_type: "neo",
          grade_before: "rare", grade_after: "epic",
          quantity_used: 8, upgraded: true, is_miracle_time: false,
        },
      ] as const;
      const stats = aggregateRecords(records as unknown as CubeUsageRecord[]);
      expect(stats).toHaveLength(1);
      expect(stats[0].normal_count).toBe(2);
      expect(stats[0].normal_rate).toBe(8.7);
    });

    it("miracle_count = upgraded件数、miracle_rate = upgraded/total cubes*100", () => {
      const records = [
        {
          id: "m1", date: "2026-01-02", server_name: "ゆかり",
          potential_type: "potential", cube_type: "mega",
          grade_before: "epic", grade_after: "unique",
          quantity_used: 12, upgraded: true, is_miracle_time: true,
        },
        {
          id: "m2", date: "2026-01-02", server_name: "ゆかり",
          potential_type: "potential", cube_type: "mega",
          grade_before: "epic", grade_after: "unique",
          quantity_used: 8, upgraded: true, is_miracle_time: true,
        },
        {
          id: "m3", date: "2026-01-02", server_name: "ゆかり",
          potential_type: "potential", cube_type: "mega",
          grade_before: "epic", grade_after: "unique",
          quantity_used: 5, upgraded: false, is_miracle_time: true,
        },
      ] as const;
      const stats = aggregateRecords(records as unknown as CubeUsageRecord[]);
      expect(stats).toHaveLength(1);
      expect(stats[0].miracle_count).toBe(2);
      expect(stats[0].miracle_rate).toBe(8);
    });

    it("昇級成功0件の場合、昇級率が0になること", () => {
      const records = [
        {
          id: "z1", date: "2026-01-01", server_name: "かえで",
          potential_type: "additional_potential", cube_type: "neo_additional",
          grade_before: "rare", grade_after: "rare",
          quantity_used: 10, upgraded: false, is_miracle_time: false,
        },
      ] as const;
      const stats = aggregateRecords(records as unknown as CubeUsageRecord[]);
      expect(stats[0].normal_count).toBe(0);
      expect(stats[0].normal_rate).toBe(0);
    });
  });

  describe("MOCK_AGGREGATED", () => {
    it("aggregateRecords の結果と一致すること", () => {
      const manual = aggregateRecords(MOCK_RECORDS);
      expect(MOCK_AGGREGATED).toEqual(manual);
    });

    it("通常時とミラクルタイム時の両方の集計値が存在すること", () => {
      const hasNormal = MOCK_AGGREGATED.some((s) => s.normal_count >= 1);
      const hasMiracle = MOCK_AGGREGATED.some((s) => s.miracle_count >= 1);
      expect(hasNormal).toBe(true);
      expect(hasMiracle).toBe(true);
    });

    it("全表の normal_rate, miracle_rate が 0~100 であること", () => {
      for (const stat of MOCK_AGGREGATED) {
        expect(stat.normal_rate).toBeGreaterThanOrEqual(0);
        expect(stat.normal_rate).toBeLessThanOrEqual(100);
        expect(stat.miracle_rate).toBeGreaterThanOrEqual(0);
        expect(stat.miracle_rate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("totalSamples", () => {
    it("totalSamples() が MOCK_RECORDS の quantity_used 合計と一致すること", () => {
      const sum = MOCK_RECORDS.reduce((acc, r) => acc + r.quantity_used, 0);
      expect(totalSamples()).toBe(sum);
    });
  });
});