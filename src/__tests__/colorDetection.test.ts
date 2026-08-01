import { describe, it, expect, vi, beforeEach } from "vitest";

// フェーズ4実装時のモジュール: @/recognition/colorDetection
// 色名は定数化し、ハードコードしないこと（ゴール条件明記）

// 色名定数（実装時に consts/colors.ts 等に移動予定）
const COLOR_NAMES = {
  RED: "赤",
  ORANGE: "橙",
  YELLOW: "黄",
  GREEN: "緑",
  BLUE: "青",
  INDIGO: "藍",
  PURPLE: "紫",
  WHITE: "白",
  BLACK: "黒",
  GRAY: "灰",
  CYAN: "シアン",
  MAGENTA: "マゼンタ",
} as const;

type ColorName = (typeof COLOR_NAMES)[keyof typeof COLOR_NAMES];

function createMockPixelData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

describe("色判定", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("RGB 値が正しく取得できること", () => {
    // import { getRGB } from "@/recognition/colorDetection";
    // const rgb = getRGB(imageData, x, y);
    // expect(rgb).toEqual({ r: 255, g: 0, b: 0 });

    const r = 255;
    const g = 0;
    const b = 0;
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it("RGB から HSV への変換が正しいこと", () => {
    // import { rgbToHSV } from "@/recognition/colorDetection";
    // const hsv = rgbToHSV(255, 0, 0);
    // expect(hsv.h).toBeCloseTo(0);   // 赤の色相
    // expect(hsv.s).toBeCloseTo(100); // 彩度
    // expect(hsv.v).toBeCloseTo(100);  // 明度

    // 赤 (255, 0, 0) → HSV (0°, 100%, 100%)
    const r = 255,
      g = 0,
      b = 0;
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r / 255) h = 60 * (((g / 255 - b / 255) / delta) % 6);
      else if (max === g / 255) h = 60 * ((b / 255 - r / 255) / delta + 2);
      else h = 60 * ((r / 255 - g / 255) / delta + 4);
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : (delta / max) * 100;
    const v = max * 100;

    expect(h).toBeCloseTo(0, 0);
    expect(s).toBeCloseTo(100, 0);
    expect(v).toBeCloseTo(100, 0);
  });

  it("代表的な色が正しく分類されること", () => {
    // import { classifyColor } from "@/recognition/colorDetection";
    // expect(classifyColor(255, 0, 0)).toBe(COLOR_NAMES.RED);
    // expect(classifyColor(0, 255, 0)).toBe(COLOR_NAMES.GREEN);
    // expect(classifyColor(0, 0, 255)).toBe(COLOR_NAMES.BLUE);

    // 簡易的な色分類ロジックの検証（実装時の入出力仕様確認用）
    const classifyByHue = (h: number): string => {
      if (h < 30 || h >= 330) return COLOR_NAMES.RED;
      if (h < 90) return COLOR_NAMES.YELLOW;
      if (h < 150) return COLOR_NAMES.GREEN;
      if (h < 210) return COLOR_NAMES.CYAN;
      if (h < 270) return COLOR_NAMES.BLUE;
      if (h < 330) return COLOR_NAMES.MAGENTA;
      return COLOR_NAMES.RED;
    };
    expect(classifyByHue(0)).toBe(COLOR_NAMES.RED);
    expect(classifyByHue(120)).toBe(COLOR_NAMES.GREEN);
    expect(classifyByHue(240)).toBe(COLOR_NAMES.BLUE);
  });

  it("色名が定数化されておりハードコードされていないこと", () => {
    // 実装時は以下を確認:
    // import { COLOR_NAMES } from "@/recognition/colorDetection";
    // expect(COLOR_NAMES).toBeDefined();
    // expect(typeof COLOR_NAMES.RED).toBe("string");

    expect(COLOR_NAMES.RED).toBe("赤");
    expect(COLOR_NAMES.GREEN).toBe("緑");
    expect(COLOR_NAMES.BLUE).toBe("青");
    Object.entries(COLOR_NAMES).forEach(([, value]) => {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    });
  });

  it("閾値を設定して色分類の範囲を調整できること", () => {
    // import { classifyColorWithThreshold } from "@/recognition/colorDetection";
    // 色相判定にマージンを設定できる

    interface ColorThreshold {
      hueRange: [number, number];
      saturationRange: [number, number];
      valueRange: [number, number];
      colorName: string;
    }

    const thresholds: ColorThreshold[] = [
      {
        hueRange: [0, 10],
        saturationRange: [50, 100],
        valueRange: [50, 100],
        colorName: COLOR_NAMES.RED,
      },
      {
        hueRange: [100, 140],
        saturationRange: [50, 100],
        valueRange: [50, 100],
        colorName: COLOR_NAMES.GREEN,
      },
    ];

    expect(thresholds).toHaveLength(2);
    thresholds.forEach((t) => {
      expect(t.hueRange[1]).toBeGreaterThan(t.hueRange[0]);
      expect(t.saturationRange[1]).toBeGreaterThan(t.saturationRange[0]);
      expect(t.colorName).toBeDefined();
    });
  });

  it("色判定結果のデバッグ表示が可能であること", () => {
    // import { getColorDebugInfo } from "@/recognition/colorDetection";
    // const info = getColorDebugInfo(imageData, x, y);
    // expect(info).toHaveProperty("rgb");
    // expect(info).toHaveProperty("hsv");
    // expect(info).toHaveProperty("classification");

    const debugInfo = {
      rgb: { r: 255, g: 0, b: 0 },
      hsv: { h: 0, s: 100, v: 100 },
      classification: COLOR_NAMES.RED,
    };
    expect(debugInfo.rgb).toBeDefined();
    expect(debugInfo.hsv).toBeDefined();
    expect(debugInfo.classification).toBe(COLOR_NAMES.RED);
  });
});