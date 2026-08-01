// src/recognition/openCV.ts
/**
 * OpenCV.js 初期化ユーティリティ
 * グローバルに `cv` オブジェクトが存在するか確認し、存在しなければエラーを投げます。
 * 実装はシンプルに、テストでモックされた `globalThis.cv` を利用します。
 */
type CV = { Mat: unknown; [key: string]: unknown };

export async function initOpenCV(): Promise<CV> {
  // OpenCV.js は非同期でロードされることが多いので、ここでは Promise にラップします。
  return new Promise((resolve, reject) => {
    // Access global OpenCV object (may be mocked in tests)
    const cv = (globalThis as unknown as { cv?: unknown }).cv as CV;
    if (!cv) {
      reject(new Error("OpenCV がロードされていません"));
      return;
    }
    // 必要なプロパティが揃っているか簡易チェック
    if (typeof (cv as unknown as { Mat?: unknown }).Mat !== "function") {
      reject(new Error("OpenCV の API が不完全です"));
      return;
    }
    resolve(cv);
  });
}
