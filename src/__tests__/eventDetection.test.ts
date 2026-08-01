import { describe, test, expect, beforeEach } from 'vitest';
import { detectCubeStart, detectResultScreen, detectResultConfirmed } from '../recognition/eventDetector';
import type { RecognitionFrame } from '../recognition/recognitionResult';

/**
 * Create a minimal, valid-looking RecognitionFrame for testing.
 */
function makeFrame(overrides: Partial<RecognitionFrame> = {}): RecognitionFrame {
  return {
    timestamp: Date.now(),
    ocrResult: { text: 'ダミーテキスト', confidence: 0.99, boundingBox: { x: 0, y: 0, width: 100, height: 100 } },
    matches: [],
    colorInfo: [],
    server: null,
    potentialType: null,
    cubeType: null,
    gradeBefore: null,
    gradeAfter: null,
    quantityUsed: null,
    ...overrides,
  };
}

describe('eventDetector – イベント検知', () => {
  describe('detectCubeStart (キューブ使用開始判定)', () => {
    test('単一フレームでは開始イベントを返さないこと', () => {
      // single-frame decision is forbidden by the spec
      const result = detectCubeStart([makeFrame()]);
      expect(result).toBeNull();
    });

    test('空の配列では開始イベントを返さないこと', () => {
      const result = detectCubeStart([]);
      expect(result).toBeNull();
    });

    test('複数フレームからキューブ使用開始を検知できること', () => {
      // Arrange: multiple frames simulateゲーム画面 change towards cube use
      const frames: RecognitionFrame[] = [
        makeFrame({ timestamp: 1000 }),
        makeFrame({ timestamp: 1100 }),
        makeFrame({ timestamp: 1200 }),
      ];

      const result = detectCubeStart(frames);
      expect(result).toEqual({
        type: 'CUBE_START',
        timestamp: expect.any(Number),
        frame: expect.any(Object),
        metadata: expect.any(Object),
      });
    });
  });

  describe('detectResultScreen (結果画面表示判定)', () => {
    test('結果画面表示を検知できること', () => {
      const frames: RecognitionFrame[] = [
        makeFrame({ timestamp: 2000 }),
        makeFrame({ timestamp: 2100 }),
      ];

      const result = detectResultScreen(frames);
      expect(result).toEqual({
        type: 'RESULT_SCREEN',
        timestamp: expect.any(Number),
        frame: expect.any(Object),
        metadata: expect.any(Object),
      });
    });

    test('単一フレームでは結果画面を検知しないこと', () => {
      const result = detectResultScreen([makeFrame()]);
      expect(result).toBeNull();
    });
  });

  describe('detectResultConfirmed (結果確定判定)', () => {
    test('結果確定を検知できること', () => {
      const frames: RecognitionFrame[] = [
        makeFrame({ timestamp: 3000 }),
        makeFrame({ timestamp: 3100 }),
      ];

      const result = detectResultConfirmed(frames);
      expect(result).toEqual({
        type: 'RESULT_CONFIRMED',
        timestamp: expect.any(Number),
        frame: expect.any(Object),
        metadata: expect.any(Object),
      });
    });

    test('単一フレームでは確定と判定しないこと', () => {
      const result = detectResultConfirmed([makeFrame()]);
      expect(result).toBeNull();
    });
  });
});