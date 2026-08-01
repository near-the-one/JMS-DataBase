// Phase 7: ドキュメント検証テスト — 環境変数一覧
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Phase7: 環境変数", () => {
  const projectRoot = path.resolve(__dirname, "..", "..");

  it(".env.example または環境変数ドキュメントが存在する", () => {
    const envExample = path.join(projectRoot, ".env.example");
    const envDocs = path.join(projectRoot, "ENV.md");
    const hasEnvExample = fs.existsSync(envExample);
    const hasEnvDocs = fs.existsSync(envDocs);

    // 少なくとも片方は存在する必要がある
    expect(hasEnvExample || hasEnvDocs).toBe(true);
  });

  it("環境変数が README または docs/ に文書化されている", () => {
    const locations = [
      path.join(projectRoot, "..", "README.md"),
      path.join(projectRoot, "..", "docs", "devops"),
      path.join(projectRoot, "..", "docs", "database"),
    ];
    let foundEnvDoc = false;

    for (const loc of locations) {
      if (fs.existsSync(loc)) {
        const stat = fs.statSync(loc);
        if (stat.isDirectory()) {
          const files = fs.readdirSync(loc);
          for (const file of files) {
            const filePath = path.join(loc, file);
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, "utf-8");
              if (/env|環境変数|VITE_|NODE_ENV/i.test(content)) {
                foundEnvDoc = true;
                break;
              }
            }
          }
        } else if (stat.isFile()) {
          const content = fs.readFileSync(loc, "utf-8");
          if (/env|環境変数|VITE_|NODE_ENV/i.test(content)) {
            foundEnvDoc = true;
          }
        }
        if (foundEnvDoc) break;
      }
    }

    // 環境変数に関すR>ドキュメントが存在する
    expect(foundEnvDoc).toBe(true);
  });

  it("Vite プロジェクトに必要な最低限の設定がある", () => {
    const packagePath = path.join(projectRoot, "package.json");
    expect(fs.existsSync(packagePath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
    // 開発依存関係が適切に定義されている
    expect(pkg.devDependencies).toHaveProperty("vite");
    expect(pkg.devDependencies).toHaveProperty("typescript");
    expect(pkg.devDependencies).toHaveProperty("vitest");
  });
});