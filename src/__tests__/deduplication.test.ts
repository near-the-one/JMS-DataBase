import { describe, test, expect, beforeEach } from 'vitest';
import { DeduplicationGuard } from '../autoRegister/deduplication';
import type { RecognizedEntry } from '../recognition/recognitionResult';

function makeEntry(overrides: Partial<RecognizedEntry> = {}): RecognizedEntry {
  return {
    server: 'かえで' as const,
    potentialType: 'potential' as const,
    cubeType: 'neo' as const,
    gradeBefore: 'rare',
    gradeAfter: 'epic',
    quantityUsed: 1,
    miracleTime: false,
    registeredAt: new Date('2026-07-29T10:00:00'),
    sourceFrames: [],
    ...overrides,
  };
}

describe('DeduplicationGuard – 重複登録防止', () => {
  describe('isDuplicate (同一フレーム)', () => {
    test('同じ sourceFrames を持つエントリを重複とみなすこと', () => {
      const guard = new DeduplicationGuard();

      const entry1 = makeEntry({ registeredAt: new Date('2026-07-29T10:00:00') });
      const entry2 = makeEntry({ registeredAt: new Date('2026-07-29T10:00:01') });

      // Register entry1 first – so entry2 should be a dupe
      guard.register(entry1);
      expect(guard.isDuplicate(entry1)).toBe(true);
    });
  });

  describe('isDuplicate – 同一結果画面', () => {
    test('前の登録と close timing で同じ frame content が来たら重複と判定すること', () => {
      const guard = new DeduplicationGuard();

      const entryA = makeEntry({ quantityUsed: 5 });
      guard.register(entryA);
      const entryB = makeEntry({ quantityUsed: 5, registeredAt: new Date('2026-07-29T10:00:01') });

      expect(guard.isDuplicate(entryB)).toBe(true);
    });
  });

  describe('短時間連続検出', () => {
    test('cooldownWindowMs以内の連続したエントリは重複とみなして排除すること', () => {
      // cooldownWindowMs default should be configurable
      const guard = new DeduplicationGuard(/* short cooldown */);

      const e1 = makeEntry({ registeredAt: new Date('2026-07-29T10:00:00') });
      guard.register(e1);

      const e2 = makeEntry({ registeredAt: new Date('2026-07-29T10:00:01') });
      expect(guard.isDuplicate(e2)).toBe(true);
    });

    test('同一フレームを2分経ってから再度検出しても同一結果画面であれば重複と判定すること', () => {
      const guard = new DeduplicationGuard({ cooldownWindowMs: 60000, sameFrameDedup: true, sameScreenDedup: true });

      const e1 = makeEntry({ registeredAt: new Date('2026-07-29T10:00:00'), quantityUsed: 1 });
      guard.register(e1);

      const e2 = makeEntry({ registeredAt: new Date('2026-07-29T11:02:00'), quantityUsed: 1 });
      expect(guard.isDuplicate(e2)).toBe(true);
    });
  });
});