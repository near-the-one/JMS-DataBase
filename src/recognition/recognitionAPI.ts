// src/recognition/recognitionAPI.ts
/**
 * 統合認識API（フェーズ4）
 * テンプレートマッチング、OCR、色判定を個別モジュールから呼び出すラッパーです。
 * 現在はスタブ実装で、各モジュールのダミー実装をそのまま利用します。
 */

import { matchTemplate } from "./templateMatching";
import { extractText, preprocessForOCR } from "./ocr";
import { getColorDebugInfo } from "./colorDetection";
import type { Template } from "./templateMatching";
import type { OCRResult } from "./ocr";
import type { ColorDebugInfo } from "./colorDetection";

/**
 * テンプレートマッチング結果取得（単一候補）
 */
export async function recognizeTemplate(
  source: ImageData,
  template: Template
): Promise<{ match: Awaited<ReturnType<typeof matchTemplate>> }> {
  const match = await matchTemplate(source, template);
  return { match };
}

/**
 * OCR 実行（前処理付き）
 */
export async function recognizeOCR(
  rawImage: ImageData
): Promise<OCRResult> {
  const preprocessed = preprocessForOCR(rawImage);
  const result = await extractText(preprocessed);
  return result;
}

/**
 * 色判定（座標指定）
 */
export function detectColor(
  imageData: ImageData,
  x: number,
  y: number
): ColorDebugInfo {
  return getColorDebugInfo(imageData, x, y);
}
