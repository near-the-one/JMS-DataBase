// Phase 7: ドキュメント検証テスト — README の更新
// README の存在、最新性、内容の網羅性を検証する
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Phase7: README", () => {
  const projectRoot = path.resolve(__dirname, "..", ".."); // capture-app root
  const readmePath = path.resolve(projectRoot, ".."); // project root

  it("プロジェクトルートに README.md が存在する", () => {
    const rootReadme = path.join(readmePath, "README.md");
    expect(fs.existsSync(rootReadme)).toBe(true);
  });

  it("README.md が空ではない", () => {
    const rootReadme = path.join(readmePath, "README.md");
    if (fs.existsSync(rootReadme)) {
      const content = fs.readFileSync(rootReadme, "utf-8");
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it("README.md にプロジェクト名が含まれている", () => {
    const rootReadme = path.join(readmePath, "README.md");
    if (fs.existsSync(rootReadme)) {
      const content = fs.readFileSync(rootReadme, "utf-8");
      expect(content).toMatch(/Maple.?CUBE|CubeCounter/i);
    }
  });

  it("README.md にセットアップ手順または開発手順が含まれている", () => {
    const rootReadme = path.join(readmePath, "README.md");
    if (fs.existsSync(rootReadme)) {
      const content = fs.readFileSync(rootReadme, "utf-8");
      const hasSetupGuide = /setup|セットアップ|インストール|install|開発|dev/i.test(content);
      expect(hasSetupGuide).toBe(true);
    }
  });

  it("README.md にプロジェクトの説明が含まれている", () => {
    const rootReadme = path.join(readmePath, "README.md");
    if (fs.existsSync(rootReadme)) {
      const content = fs.readFileSync(rootReadme, "utf-8");
      // 少なくとも何らかの説明文が存在する（行数で判断）
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      expect(lines.length).toBeGreaterThan(5);
    }
  });
});