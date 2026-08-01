import { describe, it, expect, vi, beforeEach } from "vitest";
import { recognizeTemplate, recognizeOCR, detectColor } from "@/recognition/recognitionAPI";
import { TemplateRegistry, Template } from "@/recognition/templateMatching";
import { COLOR_NAMES } from "@/recognition/colorDetection";

/**
 * テストはスタブ実装に基づくシンプルな期待値を検証します。
 * 実装が変わった場合はテスト側も合わせて更新してください。
 */

describe("認識API", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("テンプレートマッチングが結果を返すこと", async () => {
    const registry = new TemplateRegistry();
    const dummyImg = new ImageData(10, 10);
    registry.register("dummy", dummyImg, 0.8);
    const tmpl = registry.get("dummy") as Template;
    const source = new ImageData(20, 20);
    const res = await recognizeTemplate(source, tmpl);
    expect(res.match).toBeDefined();
    expect(res.match.score).toBeGreaterThanOrEqual(0);
    expect(res.match.score).toBeLessThanOrEqual(1);
  });

  it("OCR がテキスト・信頼度・バウンディングボックスを返すこと", async () => {
    const img = new ImageData(100, 50);
    const ocr = await recognizeOCR(img);
    expect(ocr).toBeDefined();
    expect(typeof ocr.text).toBe("string");
    expect(ocr.confidence).toBeGreaterThanOrEqual(0);
    expect(ocr.confidence).toBeLessThanOrEqual(1);
    expect(ocr.boundingBox).toBeDefined();
    expect(ocr.boundingBox.width).toBe(img.width);
    expect(ocr.boundingBox.height).toBe(img.height);
  });

  it("色判定が RGB・HSV・分類結果を返すこと", () => {
    const img = new ImageData(5, 5);
    // ピクセル (0,0) はデフォルトで (0,0,0,0) なので黒になる
    const info = detectColor(img, 0, 0);
    expect(info).toBeDefined();
    expect(info.rgb).toBeDefined();
    expect(info.hsv).toBeDefined();
    // classification はカラー定数のどれかであることをチェック
    const values = Object.values(COLOR_NAMES);
    expect(values).toContain(info.classification);
  });
});
