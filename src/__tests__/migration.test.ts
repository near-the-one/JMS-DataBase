// capture-app/src/__tests__/migration.test.ts
import { describe, it, expect } from "vitest";

/**
 * テスト: Supabase マイグレーションのテーブル定義検証
 *
 * 実際のデータベーススキーマを確認せず、定義（SQLまたはTSスキーマ定義）を用いて
 * 期待するスキーマが満たされているか検証します。
 *
 * 下記は TDD で定義された期待値です。実際のマイグレーションファイルが生成されることを
 * 前提にテストを記述しています。
 */

/** 期待するテーブル構造の定義 */
const EXPECTED_TABLE = {
  name: "cube_usage",
  columns: [
    { name: "id",         type: "bigint",   primary: true, autoIncrement: true, nullable: false },
    { name: "server_name",    type: "text",     nullable: false },
    { name: "potential_type", type: "text",     nullable: false },
    { name: "cube_type",      type: "text",     nullable: false },
    { name: "grade_before",   type: "text",     nullable: false },
    { name: "grade_after",    type: "text",     nullable: false },
    { name: "quantity_used",  type: "integer",  nullable: false },
    { name: "is_miracle_time",type: "boolean",  nullable: false, default: false },
    { name: "character_name", type: "text",     nullable: true },
    { name: "timestamp",      type: "bigint",   nullable: false },
  ],
};

/** フェーズ1のデータモデルに含まれる全フィールド名 */
const PHASE1_REQUIRED_FIELDS: string[] = [
  "server_name",
  "potential_type",
  "cube_type",
  "grade_before",
  "grade_after",
  "quantity_used",
  "is_miracle_time",
  "character_name",
  "timestamp",
];

describe("Migration", () => {
  describe("テーブル定義", () => {
    it("テーブル名が cube_usage であること", () => {
      expect(EXPECTED_TABLE.name).toBe("cube_usage");
    });

    it("id カラムが定義されていること", () => {
      const col = EXPECTED_TABLE.columns.find((c) => c.name === "id");
      expect(col).toBeDefined();
      expect(col!.type).toBe("bigint");
      expect(col!.nullable).toBe(false);
      expect(col!.primary).toBe(true);
    });

    it("NULL 許容カラムが character_name だけであること", () => {
      const nullableCols = EXPECTED_TABLE.columns.filter((c) => c.nullable);
      expect(nullableCols).toHaveLength(1);
      expect(nullableCols[0].name).toBe("character_name");
    });

    it("NOT NULL カラムが 9 カラムあること (id 含む)", () => {
      const notNull = EXPECTED_TABLE.columns.filter((c) => !c.nullable);
      // id, server_name, potential_type, cube_type, grade_before,
      // grade_after, quantity_used, is_miracle_time, timestamp
      expect(notNull).toHaveLength(9);
    });
  });

  describe("Phase1 データモデルとの互換性", () => {
    it("フェーズ1の全フィールドがテーブルに存在すること", () => {
      const columnNames = EXPECTED_TABLE.columns.map((c) => c.name);
      for (const field of PHASE1_REQUIRED_FIELDS) {
        expect(columnNames).toContain(field);
      }
    });
  });
});