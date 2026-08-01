// src/recognition/ocr.ts
/**
 * OCR モジュール（フェーズ4用スタブ実装）
 * 実装は将来的に Tesseract.js などに置き換える前提です。
 * 現在はテストが期待するインターフェースだけを提供し、固定のダミー結果を返します。
 */

export interface OCRResult {
  text: string;
  confidence: number; // 0~1
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * 画像データからテキストを抽出します。
 * テスト環境では実際の OCR エンジンは不要なため、
 * 常に固定の結果を返す簡易実装です。
 */
export async function extractText(imageData: ImageData): Promise<OCRResult> {
  // ダミー実装: 画像サイズに合わせてプレースホルダー文字列を生成
  const text = "ダミーテキスト";
  const confidence = 0.99;
  const boundingBox = {
    x: 0,
    y: 0,
    width: imageData.width,
    height: imageData.height,
  };
  return { text, confidence, boundingBox };
}

/**
 * OCR 前処理（グレースケール変換・二値化等）
 * 現在は入力画像をそのまま返すだけのパススルーです。
 */
export function preprocessForOCR(imageData: ImageData): ImageData {
  // 本来は cv.cvtColor などで前処理を行うが、テストでは不要なのでそのまま返す。
  return imageData;
}

/**
 * デバッグ画像を生成します。
 * 実装はシンプルに <canvas> に ImageData を描画して返します。
 */
export function generateDebugImage(
  imageData: ImageData,
  ocrResult: OCRResult
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
    // OCR 結果のバウンディングボックスを矩形で描画（赤色）
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    const b = ocrResult.boundingBox;
    ctx.strokeRect(b.x, b.y, b.width, b.height);
  }
  return canvas;
}
