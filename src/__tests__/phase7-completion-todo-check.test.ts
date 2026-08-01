// Phase 7: TODOコメント残存防止テスト
// 完了条件「TODOコメントを残さない」を検証します
// ソースコード内に TODO / FIXME / HACK / XXX のマーカーが一切残っていないことを確認する
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Phase7: TODOコメントの残存チェック", () => {
  const srcRoot = path.resolve(__dirname, ".."); // capture-app/src/

  /** 指定ディレクトリ配下の .ts / .tsx ファイルを再帰的に収集する */
  function collectSourceFiles(dir: string, files: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "__tests__" && entry.name !== "node_modules") {
        collectSourceFiles(fullPath, files);
      } else if ((entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) && entry.isFile()) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it("ソースコードに TODO コメントが残っていないこと", () => {
    const sourceFiles = collectSourceFiles(srcRoot);

    // __tests__ ディレクトリ配下のファイルも追加で収集（テストファイル内のTODO検出用）
    const testDir = path.join(srcRoot, "__tests__");
    if (fs.existsSync(testDir)) {
      for (const entry of fs.readdirSync(testDir, { withFileTypes: true })) {
        if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
          sourceFiles.push(path.join(testDir, entry.name));
        }
      }
    }

    const todoPattern = /\b(TODO|FIXME|HACK|XXX)\b[:\s]/;
    const violations: string[] = [];
    const ownFile = path.resolve(__dirname, "phase7-completion-todo-check.test.ts");

    for (const filePath of sourceFiles) {
      // 自分自身のファイルはスキップ
      if (path.resolve(filePath) === ownFile) continue;
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        // コメント行のみチェック (// または /* を含む行、ただし import 内のコメントは除外)
        const trimmed = lines[i].trim();
        if (
          (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.includes("//")) &&
          todoPattern.test(lines[i])
        ) {
          const relative = path.relative(srcRoot, filePath);
          violations.push(`${relative}:${i + 1}: ${lines[i].trim()}`);
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `ソースコードにTODO/FIXME/HACK/XXXコメントが ${violations.length} 件検出されました:\n${violations.join("\n")}`,
      );
    }
    // パスすれば OK
    expect(true).toBe(true);
  });
});