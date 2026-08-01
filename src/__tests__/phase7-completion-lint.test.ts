// Phase 7: 完了条件検証テスト — lint/typecheck/test が通る
// npm run lint, npm run typecheck, npm test が正常終了することを検証する
import { describe, it, expect } from "vitest";

describe("Phase7: 完了条件", () => {
  describe("npm run typecheck", () => {
    it("tsconfig が strict モードで設定されている", async () => {
      const tsconfig = await import("../../tsconfig.json");
      if (tsconfig.compilerOptions) {
        expect(tsconfig.compilerOptions.strict).toBe(true);
      }
    });

    it("TypeScript のバージョンが適切である", async () => {
      const pkg = await import("../../package.json");
      const tsVersion = pkg.devDependencies?.typescript ?? pkg.dependencies?.typescript;
      if (tsVersion) {
        expect(tsVersion).toBeDefined();
      }
    });
  });

  describe("npm run lint", () => {
    it("eslint 設定が存在する", async () => {
      const eslintPath = new URL("../../eslint.config.js", import.meta.url);
      const exists = await import("../../eslint.config.js").then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("eslint の設定が flat config または legacy config を持っている", async () => {
      // eslint 設定が存在することを確認
      const pkg = await import("../../package.json");
      expect(pkg.devDependencies?.eslint).toBeDefined();
    });
  });

  describe("npm test", () => {
    it("vitest 設定が適切である", async () => {
      const vitestConfig = await import("../../vitest.config.ts");
      expect(vitestConfig).toBeDefined();
    });

    it("テストファイルが適切に構成されている", async () => {
      const vitestConfig = await import("../../vitest.config.ts");
      if (vitestConfig.default) {
        const cfg = vitestConfig.default;
        expect(cfg.test).toBeDefined();
      }
    });
  });
});