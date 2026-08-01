import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("projectConfig", () => {
  describe("package.json のスクリプト設定", () => {
    it("dev が `vite --port 3000` に設定されていること", async () => {
      const pkg = await import("../../package.json");
      expect(pkg.scripts.dev).toBe("vite --port 3000");
    });

    it("lint スクリプトが定義されていること", async () => {
      const pkg = await import("../../package.json");
      expect(pkg.scripts.lint).toBeDefined();
      expect(pkg.scripts.lint).toContain("eslint");
    });

    it("typecheck スクリプトが定義されていること", async () => {
      const pkg = await import("../../package.json");
      expect(pkg.scripts.typecheck).toBeDefined();
      expect(pkg.scripts.typecheck).toContain("tsc");
    });

    it("test スクリプトが定義されていること", async () => {
      const pkg = await import("../../package.json");
      expect(pkg.scripts.test).toBeDefined();
      expect(pkg.scripts.test).toContain("vitest");
    });
  });

  describe("TypeScript 設定", () => {
    it("strict モードが有効であること", async () => {
      const pkg = await import("../../tsconfig.json");
      expect(pkg.compilerOptions.strict).toBe(true);
    });

    it("jsx が react-jsx に設定されていること", async () => {
      const pkg = await import("../../tsconfig.json");
      expect(pkg.compilerOptions.jsx).toBe("react-jsx");
    });

    it("noEmit が true であること（型チェックのみ）", async () => {
      const pkg = await import("../../tsconfig.json");
      expect(pkg.compilerOptions.noEmit).toBe(true);
    });
  });

  describe("Vitest 設定", () => {
    it("jsdom 環境が設定されていること", () => {
      const raw = readFileSync(
        resolve(__dirname, "../../vitest.config.ts"),
        "utf-8",
      );
      expect(raw).toMatch(/environment:\s*["']jsdom["']/);
    });

    it("globals が有効になっていること", () => {
      const raw = readFileSync(
        resolve(__dirname, "../../vitest.config.ts"),
        "utf-8",
      );
      expect(raw).toMatch(/globals:\s*true/);
    });
  });

  describe("完了条件の確認", () => {
    it("lint スクリプトが --max-warnings 0 で設定されていること", async () => {
      const pkg = await import("../../package.json");
      expect(pkg.scripts.lint).toContain("--max-warnings 0");
    });

    it("typecheck が tsc --noEmit を使用していること", async () => {
      const pkg = await import("../../package.json");
      expect(pkg.scripts.typecheck).toContain("tsc --noEmit");
    });
  });
});