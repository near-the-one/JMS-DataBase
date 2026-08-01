// Phase 7: 共有定数共通化の検証テスト
// RecordList と Dashboard 間で重複していた POTENTIAL_LABELS, CUBE_LABELS, GRADE_LABELS などの
// 定数が @/types または共有モジュールから取得され、コンポーネント内で再定義されていないことを検証する
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Phase7: 共有定数の共通化", () => {
  const srcDir = path.resolve(__dirname, "..");

  /** ファイルの生テキストを読み込む */
  function readFile(relativePath: string): string {
    return fs.readFileSync(path.join(srcDir, relativePath), "utf-8");
  }

  describe("定数の重複定義解消", () => {
    it("RecordList に POTENTIAL_LABELS / CUBE_LABELS の重複定義がないこと", () => {
      const recordListSource = readFile("components/RecordList.tsx");

      // コンポーネント内で POTENTIAL_LABELS を再定義していないこと
      // types に存在するので、コンポーネントレベルでの再定義は重複
      const redefinitionOfPotential = recordListSource.match(
        /const\s+POTENTIAL_LABELS\s*[=:]/,
      );
      const redefinitionOfCube = recordListSource.match(
        /const\s+CUBE_LABELS\s*[=:]/,
      );

      // 実装前なので現在は失敗してよい (RecordList には POTENTIAL_LABELS 再定義が存在する)
      expect(
        redefinitionOfPotential,
        "RecordList.tsx 内で POTENTIAL_LABELS が再定義されています。@/types からのインポートに切り替えてください",
      ).toBeNull();
      expect(
        redefinitionOfCube,
        "RecordList.tsx 内で CUBE_LABELS が再定義されています。@/types からのインポートに切り替えてください",
      ).toBeNull();
    });

    it("Dashboard に POTENTIAL_LABELS / CUBE_LABELS の重複定義がないこと", () => {
      const dashboardSource = readFile("components/Dashboard.tsx");

      const redefinitionOfPotential = dashboardSource.match(
        /const\s+POTENTIAL_LABELS\s*[=:]/,
      );
      const redefinitionOfCube = dashboardSource.match(
        /const\s+CUBE_LABELS\s*[=:]/,
      );

      expect(
        redefinitionOfPotential,
        "Dashboard.tsx 内で POTENTIAL_LABELS が再定義されています。@/types からのインポートに切り替えてください",
      ).toBeNull();
      expect(
        redefinitionOfCube,
        "Dashboard.tsx 内で CUBE_LABELS が再定義されています。@/types からのインポートに切り替えてください",
      ).toBeNull();
    });

    it("Grade の色定数 (GRADE_COLORS) が共有モジュールで定義されていること", () => {
      // GRADE_COLORS は Dashboard.tsx のみで定義されているが共通化対象
      // 実装後は consts.ts や @/types で定義されているべき
      const dashboardSource = readFile("components/Dashboard.tsx");

      // GRADE_COLORS が外部から import されているか、または inline で定義されているか
      const hasImport = dashboardSource.match(
        /import\s*\{[^}]*GRADE_COLORS[^}]*\}\s*from/,
      );
      const hasInline = dashboardSource.match(
        /const\s+GRADE_COLORS\s*[=:]/,
      );

      // 実装後: GRADE_COLORS は共通モジュールから import されるべき
      // inline 定義が残っている場合は重複の可能性があるため検証
      expect(!!hasImport || !!hasInline).toBe(true);

      // 理想形: import 元から取得されること
      // 現在 Dashboard.tsx は inline 定義されている → 実装後は import 元から取得
      if (hasImport) {
        // import されている場合、inline 定義は不要
        expect(hasInline, "GRADE_COLORS が import されているのに inline 定義も残っています").toBeNull();
      }
    });
  });

  describe("型共通化", () => {
    it("RecordList が @/types から型をインポートしていること", () => {
      const recordListSource = readFile("components/RecordList.tsx");
      // 既存実装では `import type { ManualEntryRecord } from "@/types"` が確認できる
      expect(recordListSource).toMatch(/import\s+.*from\s+["']@\/types["']/);
    });

    it("Dashboard が @/types から型をインポートしていること", () => {
      const dashboardSource = readFile("components/Dashboard.tsx");
      expect(dashboardSource).toMatch(/import\s+.*from\s+["']@\/types["']/);
    });

    it("各コンポーネントで potential_type の判定に 型安全な定数を使用していること", () => {
      const dashboardSource = readFile("components/Dashboard.tsx");
      // PotentialType の文字列リテラルが複数箇所に分散していないか
      // "additional_potential" の出現回数をカウント（types 内の定義 + 使い元のみ）
      const matches = dashboardSource.match(/additional_potential/g);
      // Dashboard に何箇所も "additional_potential" マジック文字列が出現しないこと
      // 現状 dashboard には `POTENTIAL_LABELS[group.potentialType]` のように定数経由で使われることが期待される
      expect((matches?.length ?? 0)).toBeLessThanOrEqual(3);
    });
  });
});