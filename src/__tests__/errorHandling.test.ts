import { describe, test, expect } from 'vitest';
import { autoRegisterEntry } from '../autoRegister/registrationService';
import { DeduplicationGuard } from '../autoRegister/deduplication';
import { createRecordRepository } from '../data/recordRepository';
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
    registeredAt: new Date('2026-07-29T12:00:00'),
    sourceFrames: [],
    ...overrides,
  };
}

describe('エラー処理', () => {
  test('認識失敗時にアプリが停止しないこと', async () => {
    const repo = createRecordRepository();
    const guard = new DeduplicationGuard();
    const brokenEntry = makeEntry({ server: null as unknown as never, quantityUsed: 0 });

    const result = await autoRegisterEntry(brokenEntry, repo, guard);
    expect(result).toBeNull();
  });

  test('登録失敗時はアプリが停止しないこと', async () => {
    const repo = createRecordRepository();
    const guard = new DeduplicationGuard();
    const entry = makeEntry({ quantityUsed: 1 });

    const brokenRepo = {
      ...repo,
      add: () => { throw new Error('DB error'); },
    };

    const result = await autoRegisterEntry(entry, brokenRepo, guard);
    expect(result).toBeNull();
  });

  test('通信失敗を適切に扱えること – 失敗時はアプリ全体が停止しない', async () => {
    const repo = createRecordRepository();
    const guard = new DeduplicationGuard();
    const entry = makeEntry({ quantityUsed: 5 });

    const networkRepo = {
      ...repo,
      add: () => { throw new Error('Network error: connection refused'); },
    };

    const result = await autoRegisterEntry(entry, networkRepo, guard);
    expect(result).toBeNull();
  });

  test('重複検出時はアプリが停止しないこと', () => {
    const guard = new DeduplicationGuard();
    const entry = makeEntry({ quantityUsed: 1 });
    guard.register(entry);

    const isDup = guard.isDuplicate(entry);
    expect(isDup).toBe(true);
  });

  test('データ不足時に適切にハンドリングされること', async () => {
    const repo = createRecordRepository();
    const guard = new DeduplicationGuard();
    const brokenEntry = { ...makeEntry(), server: undefined as unknown as never, potentialType: undefined as unknown as never };

    // 不足データの場合は登録されず null が返ること
    const result = await autoRegisterEntry(brokenEntry, repo, guard);
    expect(result).toBeNull();
    expect(await repo.count()).toBe(0);
  });
});