import { describe, test, expect } from 'vitest';
import { buildRecordFromEntry, autoRegisterEntry } from '../autoRegister/registrationService';
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

describe('registrationService – 登録データ生成', () => {
  describe('buildRecordFromEntry', () => {
    test('RecognizedEntry を ManualEntryRecord に変換できること', () => {
      const entry = makeEntry({
        server: 'かえで',
        potentialType: 'potential',
        cubeType: 'neo',
        gradeBefore: 'rare',
        gradeAfter: 'epic',
        quantityUsed: 2,
        miracleTime: false,
      });
      const record = buildRecordFromEntry(entry);
      expect(record).toEqual(expect.objectContaining({
        server_name: 'かえで',
        potential_type: 'potential',
        cube_type: 'neo',
        grade_before: 'rare',
        grade_after: 'epic',
        quantity_used: 2,
        character_name: null,
        timestamp: 1785294000000,
      }));
    });
  });
});