import { describe, test, expect } from 'vitest';
import { autoRegisterEntry, buildRecordFromEntry } from '../autoRegister/registrationService';
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

describe('autoRegistration – 自動登録 & Repository保存', () => {
  test('認識結果が Repository 経由で保存されること', async () => {
    const repo = createRecordRepository();
    const guard = new DeduplicationGuard();
    const entry = makeEntry({ quantityUsed: 2, registeredAt: new Date() });

    const record = await autoRegisterEntry(entry, repo, guard);

    expect(record).not.toBeNull();
    expect(record!.id).toBe(1);
    expect(await repo.count()).toBe(1);
    expect((await repo.getAll())[0]).toMatchObject({
      server_name: 'かえで',
      quantity_used: 2,
    });
  });

  test('重複エントリは Repository に保存されないこと', async () => {
    const repo = createRecordRepository();
    const guard = new DeduplicationGuard();
    const entry = makeEntry({ quantityUsed: 2 });

    await autoRegisterEntry(entry, repo, guard); // first registration
    const duplicateResult = await autoRegisterEntry(entry, repo, guard);

    expect(duplicateResult).toBeNull();
    expect(await repo.count()).toBe(1);
  });
});