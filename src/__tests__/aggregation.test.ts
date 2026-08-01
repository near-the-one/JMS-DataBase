// Phase6: 集計ロジックテスト
import { describe, it, expect } from "vitest";
import { aggregateRecords } from "@/data/mockData";
import type { CubeUsageRecord, AggregatedStat } from "@/types";

describe("aggregation", () => {
  it("正常系: 集計結果に期待通りのカウントと昇級率があること", () => {
    const records: CubeUsageRecord[] = [
      // neo, rare→epic (成功)
      {
        id: 1,
        date: "2026-07-01",
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 10,
        upgraded: true,
        is_miracle_time: false,
      },
      // neo, rare→epic (失敗)
      {
        id: 2,
        date: "2026-07-01",
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "rare",
        quantity_used: 5,
        upgraded: false,
        is_miracle_time: false,
      },
      // mega, epic→unique (ミラクルタイムで成功)
      {
        id: 3,
        date: "2025-11-01",
        server_name: "ゆかり",
        potential_type: "potential",
        cube_type: "mega",
        grade_before: "epic",
        grade_after: "unique",
        quantity_used: 8,
        upgraded: true,
        is_miracle_time: true,
      },
      // neo_additional, unique→legendary (ミラクルタイムで失敗)
      {
        id: 4,
        date: "2025-11-01",
        server_name: "くるみ",
        potential_type: "additional_potential",
        cube_type: "neo_additional",
        grade_before: "unique",
        grade_after: "unique",
        quantity_used: 4,
        upgraded: false,
        is_miracle_time: true,
      },
    ];

    const stats: AggregatedStat[] = aggregateRecords(records);
    // neo rare→epic: 1 success / 10 total used = 10%
    const neoStat = stats.find(
      (s) => s.cube_type === "neo" && s.grade_from === "rare" && s.grade_to === "epic",
    );
    expect(neoStat).toBeDefined();
    expect(neoStat?.normal_count).toBe(1);
    expect(neoStat?.normal_rate).toBeCloseTo(10, 0);

    // mega epic→unique (miracle): 1 success / 8 total used = 12.5%
    const megaStat = stats.find(
      (s) => s.cube_type === "mega" && s.grade_from === "epic" && s.grade_to === "unique",
    );
    expect(megaStat).toBeDefined();
    expect(megaStat?.miracle_count).toBe(1);
    expect(megaStat?.miracle_rate).toBeCloseTo(12.5, 0);
  });
});
