// src/recognition/colorDetection.ts
/**
 * 色判定 API（フェーズ4スタブ実装）
 * カラー名は定数化し、ハードコードしないようにします。
 * 実装は RGB → HSV 変換と簡易的な色分類ロジックのみです。
 */

export const COLOR_NAMES = {
  RED: "赤",
  ORANGE: "橙",
  YELLOW: "黄",
  GREEN: "緑",
  BLUE: "青",
  INDIGO: "藍",
  VIOLET: "紫",
  WHITE: "白",
  BLACK: "黒",
  GRAY: "灰",
  CYAN: "シアン",
  MAGENTA: "マゼンタ",
} as const;

type ColorName = (typeof COLOR_NAMES)[keyof typeof COLOR_NAMES];

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

/**
 * 画像データから指定座標の RGB 値を取得します。
 * x, y はピクセル座標（0-index）で、画像の幅・高さを超えた場合は例外を投げます。
 */
export function getRGB(imageData: ImageData, x: number, y: number): RGB {
  if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
    throw new Error("座標が画像範囲外です");
  }
  const idx = (y * imageData.width + x) * 4;
  const d = imageData.data;
  return { r: d[idx], g: d[idx + 1], b: d[idx + 2] };
}

/**
 * RGB → HSV 変換（0-255 の RGB を 0-360, 0-100, 0-100 の HSV に変換）
 */
export function rgbToHSV({ r, g, b }: RGB): HSV {
  const rp = r / 255;
  const gp = g / 255;
  const bp = b / 255;
  const max = Math.max(rp, gp, bp);
  const min = Math.min(rp, gp, bp);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rp) {
      h = 60 * (((gp - bp) / delta) % 6);
    } else if (max === gp) {
      h = 60 * ((bp - rp) / delta + 2);
    } else {
      h = 60 * ((rp - gp) / delta + 4);
    }
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

/**
 * 簡易色分類ロジック
 * hue の範囲で赤・黄・緑・シアン・青・マゼンタに分類し、
 * それ以外はグレー系とします。
 */
export function classifyColor(rgb: RGB): ColorName {
  const { h } = rgbToHSV(rgb);
  if (h < 30 || h >= 330) return "赤" as ColorName; // RED
  if (h < 90) return "黄" as ColorName; // YELLOW
  if (h < 150) return "緑" as ColorName; // GREEN
  if (h < 210) return "シアン" as ColorName; // CYAN
  if (h < 270) return "青" as ColorName; // BLUE
  if (h < 330) return "マゼンタ" as ColorName; // MAGENTA
  return "赤" as ColorName; // fallback
}

/**
 * 色判定結果のデバッグ情報
 */
export interface ColorDebugInfo {
  rgb: RGB;
  hsv: HSV;
  classification: ColorName;
}

export function getColorDebugInfo(
  imageData: ImageData,
  x: number,
  y: number
): ColorDebugInfo {
  const rgb = getRGB(imageData, x, y);
  const hsv = rgbToHSV(rgb);
  const classification = classifyColor(rgb);
  return { rgb, hsv, classification };
}
