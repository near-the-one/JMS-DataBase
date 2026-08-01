/**
 * Phase 2: 型定義の検証テスト
 *
 * - CubeUsageRecord に `potential_type`, `server_name`, `is_miracle_time` が必須で含まれること
 * - ManualEntryRecord に `part?` と `usedAt?` がオプショナルで存在すること
 * - それぞれの enum/union が期待通りの型を持つことをコンパイル時に確認するため、
 *   TypeScript の型アサーションを利用したランタイムテストを実装します。
 */
import { expect, it, describe } from "vitest";
import type {
  CubeUsageRecord,
  ManualEntryRecord,
  PotentialType,
  CubeType,
  Grade,
  ServerName,
} from "@/types";

/**
 * ヘルパー: 型が期待通りに存在するかだけを実行時に検証します。
 * TypeScript の型システムはコンパイル時にチェックされますが、
 * ここでは実際にプロパティへアクセスできるかで確保します。
 */
function assertCubeUsage(record: CubeUsageRecord) {
  // 必須フィールドのアクセス（存在すればコンパイルが通ります）
  const _potential: PotentialType = record.potential_type;
  const _server: ServerName = record.server_name;
  const _miracle: boolean = record.is_miracle_time;
  // いくつかの enum 値を使って正しい型か確認
  expect(["potential", "additional_potential"]).toContain(_potential);
  expect(["かえで", "ゆかり", "くるみ", "チャレンジャーズ"]).toContain(_server);
  expect(typeof _miracle).toBe("boolean");
}

function assertManualEntry(record: ManualEntryRecord) {
  // 必須フィールドへアクセス（型チェックはコンパイル時）
  const _server: ServerName = record.server_name;
  const _potential: PotentialType = record.potential_type;
  const _cube: CubeType = record.cube_type;
  const _gradeBefore: Grade = record.grade_before;
  const _gradeAfter: Grade = record.grade_after;
  const _quantity: number = record.quantity_used;
  const _miracle: boolean = record.is_miracle_time;

  // optional fields
  if (record.part !== undefined) {
    expect(typeof record.part).toBe("string");
    // 部位は定義済みオプションのどれか、未選択は "other" として保存される
    const allowed = ["weapon", "hat", "gloves", "shoes", "overall", "accessory", "other"]; // テスト側で定義（実装側は同等）
    expect(allowed).toContain(record.part);
  }
  if (record.usedAt !== undefined) {
    // ISO 8601 文字列であることを確認（簡易チェック）
    expect(typeof record.usedAt).toBe("string");
    expect(() => new Date(record.usedAt as string)).not.toThrow();
  }

  // 期待される列挙型の値が正しいかサンプルで検証
  expect(["potential", "additional_potential"]).toContain(_potential);
  expect(["neo", "mega", "neo_additional"]).toContain(_cube);
  expect(["rare", "epic", "unique", "legendary"]).toContain(_gradeBefore);
  expect(["rare", "epic", "unique", "legendary"]).toContain(_gradeAfter);
  expect(typeof _quantity).toBe("number");
  expect(typeof _miracle).toBe("boolean");
}

describe("Phase2: 型定義のランタイム検証", () => {
  it("CubeUsageRecord が必須フィールドを持つこと", () => {
    const sample: CubeUsageRecord = {
      id: 1,
      date: "2026-07-30",
      server_name: "かえで",
      potential_type: "potential",
      cube_type: "neo",
      grade_before: "rare",
      grade_after: "epic",
      quantity_used: 5,
      upgraded: true,
      is_miracle_time: false,
    };
    assertCubeUsage(sample);
  });

  it("ManualEntryRecord が optional part/usedAt を許容すること", () => {
    const base: Omit<ManualEntryRecord, "id"> = {
      server_name: "ゆかり",
      potential_type: "additional_potential",
      cube_type: "neo_additional",
      grade_before: "unique",
      grade_after: "legendary",
      quantity_used: 3,
      is_miracle_time: true,
      character_name: null,
      timestamp: Date.now(),
    };

    // ケース 1: optional フィールドなし
    const rec1: ManualEntryRecord = { id: 1, ...base };
    assertManualEntry(rec1);

    // ケース 2: part と usedAt が設定された場合
    const rec2: ManualEntryRecord = {
      id: 2,
      ...base,
      part: "weapon",
      usedAt: "2026/07/29 12:34",
    };
    assertManualEntry(rec2);
  });
});
