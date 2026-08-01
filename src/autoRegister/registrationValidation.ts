// Phase 5 – Validation functions for registration data.

import type { RecognizedEntry } from "../recognition/recognitionResult";

/**
 * Returns true if the entry has enough data to be meaningful.
 */
export function hasRequiredData(entry: RecognizedEntry): boolean {
  if (!entry.server) return false;
  if (!entry.potentialType) return false;
  if (!entry.cubeType) return false;
  if (!entry.gradeBefore) return false;
  if (!entry.gradeAfter) return false;
  if (entry.quantityUsed == null || entry.quantityUsed <= 0) return false;
  return true; // minimal set satisfied
}

