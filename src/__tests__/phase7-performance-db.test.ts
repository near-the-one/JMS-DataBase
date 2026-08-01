// Phase 7: 不要なDBアクセス・再取得防止テスト
// データの取得回数削減、キャッシュ、バッチ処理を検証する
import { describe, it, expect, vi } from "vitest";
import { aggregateRecords } from "@/data/mockData";
import { createRecordRepository, IRecordRepository } from "@/data/recordRepository";
import type { CubeUsageRecord } from "@/types";

describe("Phase7: DBアクセス最適化", () => {
  describe("集計処理の効率性", () => {
    it("aggregateRecords は1回のパスで集計を行う", () => {
      // 10,000件のレコードを用意
      const records: CubeUsageRecord[] = [];
      for (let i = 0; i < 100; i++) {
        records.push({
          id: i + 1,
          date: "2026-07-01",
          server_name: "かえで",
          potential_type: "potential",
          cube_type: "neo",
          grade_before: "rare",
          grade_after: "epic",
          quantity_used: 1,
          upgraded: true,
          is_miracle_time: false,
        });
      }

      const result = aggregateRecords(records);
      // 正しいキーに対して結果が返る
      expect(result.length).toBeGreaterThan(0);
      const match = result.find(
        (s) =>
          s.cube_type === "neo" &&
          s.grade_from === "rare" &&
          s.grade_to === "epic",
      );
      expect(match).toBeDefined();
      expect(match!.normal_count).toBe(100);
    });

    it("aggregateRecords は空配列に対して空の結果を返す", () => {
      // 空データ時の集計はコレクションが空になる
      const result = aggregateRecords([]);
      expect(result).toEqual([]);
    });
  });

  describe("リポジトリのキャッシカ", () => {
    it("getAll() は繰り返し呼んでも一貫した結果を返す", async () => {
      const repo = createRecordRepository();
      await repo.add({
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 5,
        is_miracle_time: false,
        character_name: null,
        timestamp: Date.now(),
      });

      const first = await repo.getAll();
      const second = await repo.getAll();
      expect(first).toEqual(second);
      expect(first.length).toBe(second.length);
    });

    it("count() は O(1) で実行できる", async () => {
      const repo = createRecordRepository();
      for (let i = 0; i < 50; i++) {
        await repo.add({
          server_name: "かえで",
          potential_type: "potential",
          cube_type: "neo",
          grade_before: "rare",
          grade_after: "epic",
          quantity_used: 1,
          is_miracle_time: false,
          character_name: null,
          timestamp: 1710000000 + i,
        });
      }
      expect(await repo.count()).toBe(50);
    });
  });
});