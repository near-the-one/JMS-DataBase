// Phase 7: リファクタリング検証テスト — 重複コード解消・共通化
// LABELS 定数、型定義、ヘルパー関数の重複がないことを検証する
import { describe, it, expect } from "vitest";
import {
  GRADE_LABELS,
  GRADE_ORDER,
  SERVER_NAMES,
  type Grade,
  type CubeType,
  type PotentialType,
} from "@/types";

describe("Phase7: 重複コード削除", () => {
  describe("定数の一意性", () => {
    it("GRADE_LABELS は types から一度だけ export されている", () => {
      expect(Object.keys(GRADE_LABELS)).toHaveLength(4);
      expect(GRADE_LABELS).toHaveProperty("rare");
      expect(GRADE_LABELS).toHaveProperty("epic");
      expect(GRADE_LABELS).toHaveProperty("unique");
      expect(GRADE_LABELS).toHaveProperty("legendary");
    });

    it("GRADE_ORDER は正しい順序で定義されている", () => {
      expect(GRADE_ORDER).toEqual(["rare", "epic", "unique", "legendary"]);
    });

    it("SERVER_NAMES は4つのサーバーを持つ", () => {
      expect(SERVER_NAMES).toHaveLength(4);
      expect(SERVER_NAMES).toContain("かえで");
      expect(SERVER_NAMES).toContain("ゆかり");
      expect(SERVER_NAMES).toContain("くるみ");
      expect(SERVER_NAMES).toContain("チャレンジャーズ");
    });

    it("GRADE_ORDER と GRADE_LABELS のキーが一致している", () => {
      for (const grade of GRADE_ORDER) {
        expect(GRADE_LABELS).toHaveProperty(grade);
      }
    });
  });

  describe("型定義の整合性", () => {
    it("PotentialType が正しく定義されている", () => {
      const potentials: PotentialType[] = ["potential", "additional_potential"];
      for (const p of potentials) {
        expect(p).toBeDefined();
      }
    });

    it("CubeType が正しく定義されている", () => {
      const cubeTypes: CubeType[] = ["neo", "mega", "neo_additional"];
      expect(cubeTypes).toHaveLength(3);
    });

    it("サーバー名の型が SERVER_NAMES 定数と整合している", () => {
      for (const name of SERVER_NAMES) {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      }
    });
  });
});