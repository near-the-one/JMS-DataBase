// Phase 5 – Recognition result data models.
// These are the structured data produced FROM recognition (OCR / template / colour)
// and fed TO the event detector.

import type { OCRResult } from "./ocr";
import type { MatchResult } from "./templateMatching";
import type { ColorDebugInfo } from "./colorDetection";
import type { PotentialType, CubeType, ServerName } from "@/types";

/**
 * A single processed frame with all recognition extracted.
 */
export interface RecognitionFrame {
  /** monotonic frame timestamp (ms) */
  timestamp: number;
  /** OCR text found */
  ocrResult: OCRResult;
  /** template matching hits */
  matches: MatchResult[];
  /** colour analysis at key points */
  colorInfo: ColorDebugInfo[];

  // --- composite results (computed from above) ---
  /** extracted server name (or null if unknown) */
  server: ServerName | null;
  /** extracted potential type (or null if unknown) */
  potentialType: PotentialType | null;
  /** extracted cube type (or null if unknown) */
  cubeType: CubeType | null;
  /** extracted grade (before operation) */
  gradeBefore: string | null;
  /** extracted grade (after operation) */
  gradeAfter: string | null;
  /** quantity of cubes used */
  quantityUsed: number | null;
}

/**
 * Aggregated result fed from the event detector to the auto-registration module.
 */
export interface RecognizedEntry {
  server: ServerName;
  potentialType: PotentialType;
  cubeType: CubeType;
  gradeBefore: string;
  gradeAfter: string;
  quantityUsed: number;
  miracleTime: boolean;
  registeredAt: Date;
  /** All the frames that contributed to this entry (garbage‑collected later) */
  sourceFrames: RecognitionFrame[];
}