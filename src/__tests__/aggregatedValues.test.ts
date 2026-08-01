import { describe, it, expect } from "vitest";
import { MOCK_RECORDS, MOCK_AGGREGATED, aggregateRecords } from "@/data/mockData";
import type { PotentialType, CubeType, AggregatedStat } from "@/types";
import { GRADE_ORDER } from "@/types";

describe("集計の全組み合わせ網羅テスト", () => {
  const EXPECTED_COMBINATIONS: {
    potential_type: PotentialType;
    cube_type: CubeType;
  }[] = [
    { potential_type: "potential", cube_type: "neo" },
    { potential_type: "potential", cube_type: "mega" },
    { potential_type: "additional_potential", cube_type: "neo_additional" },
  ];

  describe("組み合わせの存在確認", () => {
    it.each(EXPECTED_COMBINATIONS)(
      "組み合わせ potential_type=$potential_type, cube_type=$cube_type がMOCK_RECORDSに存在すること",
      ({ potential_type, cube_type }) => {
        const found = MOCK_RECORDS.some(
          (r) => r.potential_type === potential_type && r.cube_type === cube_type,
        );
        expect(found).toBe(true);
      },
    );

    it.each(EXPECTED_COMBINATIONS)(
      "組み合わせ potential_type=$potential_type, cube_type=$cube_type がMOCK_AGGREGATEDに存在すること",
      ({ potential_type, cube_type }) => {
        const found = MOCK_AGGREGATED.some(
          (s) => s.potential_type === potential_type && s.cube_type === cube_type,
        );
        expect(found).toBe(true);
      },
    );
  });

  describe("昇級遷移の検査", () => {
    it("昇級成功した全レコードの grade_after が grade_before より上位であること", () => {
      const gradeIndexMap: Record<string, number> = {
        rare: 0,
        epic: 1,
        unique: 2,
        legendary: 3,
      };

      for (const record of MOCK_RECORDS) {
        if (!record.upgraded) continue;
        const beforeIdx = gradeIndexMap[record.grade_before];
        const afterIdx = gradeIndexMap[record.grade_after];
        expect(afterIdx).toBeGreaterThan(beforeIdx);
      }
    });

    it("すべての昇級遷移の to と from が GRADE_ORDER に含まれること", () => {
      for (const stat of MOCK_AGGREGATED) {
        expect(GRADE_ORDER).toContain(stat.grade_from);
        expect(GRADE_ORDER).toContain(stat.grade_to);
      }
    });
  });

  describe("通常時とミラクルタイム時の区別", () => {
    it("少なくとも1つの集計行で normal_count > 0 かつ miracle_count > 0 であること", () => {
      const hasBoth = MOCK_AGGREGATED.some(
        (s) => s.normal_count > 0 && s.miracle_count > 0,
      );
      expect(hasBoth).toBe(true);
    });

    it("MOCK_RECORDS の is_miracle_time が正しく通常時/ミラクルタイムに振り分けられていること", () => {
      const normalRecords = MOCK_RECORDS.filter((r) => !r.is_miracle_time);
      const miracleRecords = MOCK_RECORDS.filter((r) => r.is_miracle_time);
      expect(normalRecords.length).toBeGreaterThan(0);
      expect(miracleRecords.length).toBeGreaterThan(0);
    });
  });

  describe("全種類の遷移カバレッジ", () => {
    it("GRADE_ORDER のすべての隣接遷移がMOCK_AGGREGATEDに含まれている", () => {
      const expectedTransitions: [string, string][] = [];
      for (let i = 0; i < GRADE_ORDER.length - 1; i++) {
        expectedTransitions.push([GRADE_ORDER[i], GRADE_ORDER[i + 1]]);
      }

      const allCombos = new Set<string>();
      for (const s of MOCK_AGGREGATED) {
        allCombos.add(`${s.potential_type}|${s.cube_type}|${s.grade_from}|${s.grade_to}`);
      }

      for (const [from, to] of expectedTransitions) {
        const exists = [...allCombos].some((key) =>
          key.endsWith(`|${from}|${to}`),
        );
        expect(exists).toBe(true);
      }
    });
  });

  describe("使用個数と昇級率の計算検証", () => {
    it("potential/neo/rare→epic の normal_count が 10~99 かつ normal_rate が 0~100 であること", () => {
      const stat = findStat("potential", "neo", "rare", "epic");
      expect(stat).toBeDefined();
      expect(stat!.normal_count).toBeGreaterThanOrEqual(10);
      expect(stat!.normal_count).toBeLessThanOrEqual(99);
      expect(stat!.normal_rate).toBeGreaterThanOrEqual(0);
      expect(stat!.normal_rate).toBeLessThanOrEqual(100);
    });

    it("potential/neo/epic→unique の normal_count が 10 99 の範囲であること", () => {
      const stat = findStat("potential", "neo", "epic", "unique");
      expect(stat).toBeDefined();
      expect(stat!.normal_count).toBeGreaterThanOrEqual(10);
      expect(stat!.normal_count).toBeLessThanOrEqual(99);
    });

    it("potential/neo/unique→legendary の normal_count が 10 99 の範囲であること", () => {
      const stat = findStat("potential", "neo", "unique", "legendary");
      expect(stat).toBeDefined();
      expect(stat!.normal_count).toBeGreaterThanOrEqual(10);
      expect(stat!.normal_count).toBeLessThanOrEqual(99);
    });

    it("各組み合わせの normal_rate, miracle_rate が 0 以上 100 以下であること", () => {
      for (const stat of MOCK_AGGREGATED) {
        expect(stat.normal_rate).toBeGreaterThanOrEqual(0);
        expect(stat.normal_rate).toBeLessThanOrEqual(100);
        expect(stat.miracle_rate).toBeGreaterThanOrEqual(0);
        expect(stat.miracle_rate).toBeLessThanOrEqual(100);
      }
    });

    it("grade_from != grade_to の場合 normal_count が 10 99 の範囲であること", () => {
      for (const stat of MOCK_AGGREGATED) {
        if (stat.grade_from !== stat.grade_to) {
          expect(stat.normal_count).toBeGreaterThanOrEqual(10);
          expect(stat.normal_count).toBeLessThanOrEqual(99);
        }
      }
    });
  });

  describe("ミラクルタイム時の値検証", () => {
    it("grade_from != grade_to の場合 miracle_count が 1 以上であること", () => {
      for (const stat of MOCK_AGGREGATED) {
        if (stat.grade_from !== stat.grade_to) {
          expect(stat.miracle_count).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  describe("複数サーバーにわたる集計", () => {
    it("MOCK_RECORDS には4つすべてのサーバーが含まれていること", () => {
      const servers = new Set(MOCK_RECORDS.map((r) => r.server_name));
      expect(servers.has("かえで")).toBe(true);
      expect(servers.has("ゆかり")).toBe(true);
      expect(servers.has("くるみ")).toBe(true);
      expect(servers.has("チャレンジャーズ")).toBe(true);
    });
  });

  describe("昇級失敗ケースもあること", () => {
    it("MOCK_RECORDS に upgraded=false が含まれていること", () => {
      const hasFailed = MOCK_RECORDS.some((r) => !r.upgraded);
      expect(hasFailed).toBe(true);
    });

    it("昇級失敗レコードの grade_before と grade_after が同じであること", () => {
      const failedRecords = MOCK_RECORDS.filter((r) => !r.upgraded);
      expect(failedRecords.length).toBeGreaterThan(0);
      for (const r of failedRecords) {
        expect(r.grade_before).toBe(r.grade_after);
      }
    });
  });
});

function findStat(
  potential_type: PotentialType,
  cube_type: CubeType,
  grade_from: string,
  grade_to: string,
): AggregatedStat | undefined {
  return MOCK_AGGREGATED.find(
    (s) =>
      s.potential_type === potential_type &&
      s.cube_type === cube_type &&
      s.grade_from === grade_from &&
      s.grade_to === grade_to,
  );
}