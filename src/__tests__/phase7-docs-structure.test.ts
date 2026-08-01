// Phase 7: ドキュメント検証テスト — ディレクトリ構成・開発者向け説明
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Phase7: ディレクトリ構成", () => {
  const projectRoot = path.resolve(__dirname, "..", ".."); // capture-app/

  it("src/ ディレクトリが存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "src"))).toBe(true);
  });

  it("src/components/ ディレクトリが存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "src", "components"))).toBe(true);
  });

  it("src/data/ ディレクトリが存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "src", "data"))).toBe(true);
  });

  it("src/types/ ディレクトリが存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "src", "types"))).toBe(true);
  });

  it("src/recognition/ ディレクトリが存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "src", "recognition"))).toBe(true);
  });

  it("src/autoRegister/ ディレクトリが存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "src", "autoRegister"))).toBe(true);
  });

  it("src/workers/ ディレクトリが存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "src", "workers"))).toBe(true);
  });

  it("src/__tests__/ ディレクトリが存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "src", "__tests__"))).toBe(true);
  });

  it("package.json が存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "package.json"))).toBe(true);
  });

  it("tsconfig.json が存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "tsconfig.json"))).toBe(true);
  });

  it("vite.config.ts が存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "vite.config.ts"))).toBe(true);
  });

  it("eslint.config.js が存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "eslint.config.js"))).toBe(true);
  });

  it("index.html が存在する", () => {
    expect(fs.existsSync(path.join(projectRoot, "index.html"))).toBe(true);
  });
});

describe("Phase7: 開発手順", () => {
  const projectRoot = path.resolve(__dirname, "..", ".."); // capture-app/

  it("package.json に必要な scripts が定義されている", () => {
    const pkgPath = path.join(projectRoot, "package.json");
    expect(fs.existsSync(pkgPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    // Phase 7 完了条件で必要なスクリプト
    expect(pkg.scripts).toHaveProperty("dev");
    expect(pkg.scripts).toHaveProperty("build");
    expect(pkg.scripts).toHaveProperty("preview");
    expect(pkg.scripts).toHaveProperty("test");
    expect(pkg.scripts).toHaveProperty("lint");
    expect(pkg.scripts).toHaveProperty("typecheck");
  });

  it("vitest の設定が存在する", () => {
    const vitestPath = path.join(projectRoot, "vitest.config.ts");
    expect(fs.existsSync(vitestPath)).toBe(true);
  });

  it("tsconfig が strict モードである", () => {
    const tsconfigPath = path.join(projectRoot, "tsconfig.json");
    expect(fs.existsSync(tsconfigPath)).toBe(true);
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));

    if (tsconfig.compilerOptions) {
      expect(tsconfig.compilerOptions.strict).toBe(true);
    }
  });
});