// Phase 5 – Auto-registration service.
// Consumes RecognizedEntry from the event detector,
// converts to the repository model, validates, deduplicates, and persists.

import type { RecognizedEntry } from "../recognition/recognitionResult";
import type { ManualEntryRecord } from "@/types";
import { DeduplicationGuard } from "./deduplication";

import { hasRequiredData } from "./registrationValidation";

import type { IRecordRepository } from "../data/recordRepository";

/**
 * Converts a RecognizedEntry into a ManualEntryRecord suitable for persistence.
 */
export function buildRecordFromEntry(entry: RecognizedEntry): Omit<ManualEntryRecord, 'id'> {
  return {
    server_name: entry.server,
    potential_type: entry.potentialType as ManualEntryRecord['potential_type'],
    cube_type: entry.cubeType as ManualEntryRecord['cube_type'],
    grade_before: entry.gradeBefore as ManualEntryRecord['grade_before'],
    grade_after: entry.gradeAfter as ManualEntryRecord['grade_after'],
    quantity_used: entry.quantityUsed,
    // is_miracle_time field removed from ManualEntryRecord; handled via separate logic if needed
    character_name: null,
    timestamp: entry.registeredAt.valueOf(),
  };
}

/**
 * Persists a recognized entry to the repository.
 * Returns the record as saved, or null on failure.
 * Handles deduplication and error handling.
 */
export async function autoRegisterEntry(
  entry: RecognizedEntry,
  repository: IRecordRepository,
  dedupGuard: DeduplicationGuard
): Promise<ManualEntryRecord | null> {
  try {
    // Check for duplicate
    if (dedupGuard.isDuplicate(entry)) {
      return null;
    }

    // Validate minimal required data
    if (!hasRequiredData(entry)) {
      console.warn("registrationService: missing data, skipping entry", entry);
      return null;
    }

    const record = buildRecordFromEntry(entry);
    const persisted = repository.add(record);
    dedupGuard.register(entry);
    return persisted;
  } catch (err) {
    console.error("registrationService: unexpected error", err);
    return null;
  }
}