// Phase 5 – Event detection module.
// Analyses multiple FRAMES from recognition and produces EVENTS.

import type { RecognitionFrame } from "./recognitionResult";

/**
 * Detected events.
 */
export type CubeEventType = "CUBE_START" | "RESULT_SCREEN" | "RESULT_CONFIRMED";

export interface CubeEvent {
  type: CubeEventType;
  timestamp: number;
  /** The frame that triggered this event */
  frame: RecognitionFrame;
  metadata: Record<string, unknown>;
}

/**
 * Detect a cube-use start event from a sequence of frames.
 * Always expects at least 2 frames – never decide from a single frame.
 */
export function detectCubeStart(frames: RecognitionFrame[]): CubeEvent | null {
  if (!frames || frames.length < 2) {
    return null;
  }

  const lastFrame = frames[frames.length - 1];
  return {
    type: "CUBE_START",
    timestamp: lastFrame.timestamp,
    frame: lastFrame,
    metadata: { frameCount: frames.length },
  };
}

/**
 * Detect when the result screen appears.
 */
export function detectResultScreen(frames: RecognitionFrame[]): CubeEvent | null {
  if (!frames || frames.length < 2) {
    return null;
  }

  const lastFrame = frames[frames.length - 1];
  return {
    type: "RESULT_SCREEN",
    timestamp: lastFrame.timestamp,
    frame: lastFrame,
    metadata: { frameCount: frames.length },
  };
}

/**
 * Detect when the confirmed result of the cube operation is ready.
 */
export function detectResultConfirmed(frames: RecognitionFrame[]): CubeEvent | null {
  if (!frames || frames.length < 2) {
    return null;
  }

  const lastFrame = frames[frames.length - 1];
  return {
    type: "RESULT_CONFIRMED",
    timestamp: lastFrame.timestamp,
    frame: lastFrame,
    metadata: { frameCount: frames.length },
  };
}