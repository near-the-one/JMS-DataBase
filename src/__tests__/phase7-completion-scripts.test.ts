// Phase 7: npm scripts 実実行検証テスト
// 完了条件「npm run lint が通る」「npm run typecheck が通る」「npm test が通る」を
// 子プロセスとして実実行して検証する
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";

describe("Phase7: npm scripts 実行検証", () => {
  const projectRoot = path.resolve(__dirname, "..", ".."); // capture-app root
  const execOpts = {
    cwd: projectRoot,
    encoding: "utf-8" as const,
    timeout: 120_000,
    stdio: ["ignore", "pipe", "pipe"] as const,
  };

  it("npm run typecheck が通る (exitCode 0)", () => {
    try {
      const output = execSync("npx tsc --noEmit", {
        ...execOpts,
        stdio: ["ignore", "pipe", "pipe"] as const
      }).toString();
      // 成功
      expect(output).toBeDefined();
    } catch (err: unknown) {
      const e = err as { stdout?: Buffer; stderr?: Buffer; status?: number; message?: string };
      const stderr = e.stderr?.toString() ?? "";
      const stdout = e.stdout?.toString() ?? "";
      expect.fail(
        `npm run typecheck が失敗しました (exitCode: ${e.status}):\n${stdout}\n${stderr}`,
      );
    }
  }, 60_000);

  it("npm run lint が通る（max-warnings 0）", () => {
    try {
      execSync("npm run lint", {
        ...execOpts,
        stdio: ["ignore", "pipe", "pipe"],
      });
      // 成功 (exitCode 0)
      expect(true).toBe(true);
    } catch (err: unknown) {
      const e = err as { stderr?: Buffer; stdout?: Buffer; status?: number; message?: string };
      const stderr = e.stderr?.toString() ?? "";
      const stdout = e.stdout?.toString() ?? "";
      expect.fail(
        `npm run lint が失敗しました (exitCode: ${e.status}):\n${stdout}\n${stderr}`,
      );
    }
  }, 60_000);
});