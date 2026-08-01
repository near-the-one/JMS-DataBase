// Phase 5 – Deduplication module (standalone class, per spec requirement).

import type { RecognizedEntry } from "../recognition/recognitionResult";

/**
 * Duplicate detection strategy.
 *
 * 同一フレーム / 同一結果画面 / 短時間連続検出 を考慮した重複判定
 */
export class DeduplicationGuard {
  private registeredEntries: RecognizedEntry[] = [];
  private options: Required<DedupOptions>;

  static defaultOptions: Required<DedupOptions> = {
    cooldownWindowMs: 5000,
    sameFrameDedup: true,
    sameScreenDedup: true,
  };

  constructor(options?: Partial<DedupOptions>) {
    this.options = { ...DeduplicationGuard.defaultOptions, ...options };
  }

  /**
   * Returns true when `entry` has already been registered.
   */
  isDuplicate(entry: RecognizedEntry): boolean {
    // check from most recent to oldest
    for (let i = this.registeredEntries.length - 1; i >= 0; i--) {
      const prev = this.registeredEntries[i];
      if (this.isDup(prev, entry)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Register `entry` as a known one so future duplicates are detected.
   */
  register(entry: RecognizedEntry): void {
    this.registeredEntries.push(entry);
  }

  private isDup(prev: RecognizedEntry, cur: RecognizedEntry): boolean {
    // sameFrame dedup: identical sourceFrames reference or same frame data
    if (this.options.sameFrameDedup && hasSameFrames(prev, cur)) {
      return true;
    }

    // sameScreen dedup: same semantic content
    if (this.options.sameScreenDedup && hasSameScreenContent(prev, cur)) {
      return true;
    }

    // cooldown-aware temporal dedup
    const diffMs = Math.abs(cur.registeredAt.getTime() - prev.registeredAt.getTime());
    if (diffMs <= this.options.cooldownWindowMs && hasSameCoreData(prev, cur)) {
      return true;
    }

    return false;
  }
}

export interface DedupOptions {
  /** minimum interval (ms) between two independent entries */
  cooldownWindowMs: number;
  /** When true, consider a match on exactly the same frame as a dupe */
  sameFrameDedup: boolean;
  /** When true, consider a match on the same result screen as one result */
  sameScreenDedup: boolean;
}

// ---- private helpers ----

function hasSameFrames(a: RecognizedEntry, b: RecognizedEntry): boolean {
  if (a.sourceFrames === b.sourceFrames) return true;
  if (a.sourceFrames.length !== b.sourceFrames.length) return false;
  return a.sourceFrames.every((af, i) => af.timestamp === b.sourceFrames[i].timestamp);
}

function hasSameScreenContent(a: RecognizedEntry, b: RecognizedEntry): boolean {
  return (
    a.server === b.server &&
    a.potentialType === b.potentialType &&
    a.cubeType === b.cubeType &&
    a.gradeBefore === b.gradeBefore &&
    a.gradeAfter === b.gradeAfter &&
    a.quantityUsed === b.quantityUsed &&
    a.miracleTime === b.miracleTime
  );
}

function hasSameCoreData(a: RecognizedEntry, b: RecognizedEntry): boolean {
  return hasSameScreenContent(a, b);
}