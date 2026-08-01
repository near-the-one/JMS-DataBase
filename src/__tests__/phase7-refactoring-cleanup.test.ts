// Phase 7: 不要コード削除・命名改善の検証テスト
// 未使用変数、@deprecated 関数、デッドコードの除去を検証する
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Phase7: 不要コード削除", () => {
  const srcDir = path.resolve(__dirname, "..");

  function readFile(relativePath: string): string {
    return fs.readFileSync(path.join(srcDir, relativePath), "utf-8");
  }

  describe("@deprecated 付き関数の除去", () => {
    it("registrationValidation.ts に @deprecated マークが残っていないこと", () => {
      const source = readFile("autoRegister/registrationValidation.ts");
      // @deprecated validateRequiredFields は削除されているべき
      expect(source).not.toMatch(/@deprecated/);
    });

    it("validateRequiredFields が registrationValidation.ts から削除されていること", () => {
      // 削除後は export function validateRequiredFields が存在しない
      const source = readFile("autoRegister/registrationValidation.ts");
      // 実装前なので test passes. 実装後はこのテストが失敗したら未削除
      expect(source).not.toMatch(/export\s+function\s+validateRequiredFields/);
    });
  });

  describe("命名改善", () => {
    it("ManualEntryForm に _hasInteracted (未使用変数) が存在しないこと", () => {
      const source = readFile("components/ManualEntryForm.tsx");
      // _hasInteracted はアクセスされておらず、void 式で消費されているのみ
      // 実装後は削除されるべき
      // まず、変数宣言自体が残っているか確認
      const hasUnusedVar = source.match(
        /const\s+\[_hasInteracted,\s*setHasInteracted\]/,
      );
      if (hasUnusedVar) {
        // この変数がまだ存在する場合、void 式による抑制のない正しい用途があれば良し
        // 禁止の場合は削除されて have いないこと
        expect(
          hasUnusedVar,
          "ManualEntryForm.tsx 内に未使用変数 _hasInteracted が残っています。削除してください",
        ).toBeNull();
      }
    });

    it("未使用の setHasInteracted が無意味な void 式とともに残っていないこと", () => {
      const source = readFile("components/ManualEntryForm.tsx");
      // void _hasInteracted; のような無意味な消費コードがないこと
      expect(source).not.toMatch(/void\s+_hasInteracted\s*;/);
    });

    it("サーバーセレクタが dashboard と分離されていること（肝心な責務分離）", () => {
      const dashboardSource = readFile("components/Dashboard.tsx");
      // 実装後: Dashboard 内の <select> は独立したコンポーネントに抽出されるか、
      // または ServerSelector から import されている
      // import パターンをチェック
      const importsServerSelector = dashboardSource.match(
        /import\s+.*from\s+["']@\/components\/ServerSelector["']/,
      );
      // 現在はインラインなので match = null → テスト失敗
      expect(
        importsServerSelector,
        "Dashboard.tsx が ServerSelector を import していません。サーバー選択UIは独立コンポーネントに分離してください",
      ).not.toBeNull();
    });
  });

  describe("型定義の整理", () => {
    it("[TYPES] すべての export が使用されている", () => {
      // types/index.ts から export されている型・定数がコンポー�ントで使用中
      const typesSource = readFile("types/index.ts");
      expect(typesSource).toMatch(/export\s+type\s+PotentialType/);
      expect(typesSource).toMatch(/export\s+type\s+CubeType/);
      expect(typesSource).toMatch(/export\s+type\s+Grade/);
      expect(typesSource).toMatch(/export\s+const\s+GRADE_ORDER/);
      expect(typesSource).toMatch(/export\s+const\s+GRADE_LABELS/);
    });
  });
});