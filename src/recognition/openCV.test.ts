// Test for OpenCV initialization (Phase 4)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initOpenCV } from "./openCV";

// Minimal mock matching the shape used in initOpenCV
interface MockCV {
  Mat: ReturnType<typeof vi.fn>;
  imread: ReturnType<typeof vi.fn>;
  imwrite: ReturnType<typeof vi.fn>;
  cvtColor: ReturnType<typeof vi.fn>;
  matchTemplate: ReturnType<typeof vi.fn>;
  minMaxLoc: ReturnType<typeof vi.fn>;
  rectangle: ReturnType<typeof vi.fn>;
  putText: ReturnType<typeof vi.fn>;
  COLOR_RGBA2GRAY: number;
  COLOR_BGR2HSV: number;
  TM_CCOEFF_NORMED: number;
  TM_CCORR_NORMED: number;
  TM_SQDIFF_NORMED: number;
}

const mockCv: MockCV = {
  Mat: vi.fn(),
  imread: vi.fn(),
  imwrite: vi.fn(),
  cvtColor: vi.fn(),
  matchTemplate: vi.fn(),
  minMaxLoc: vi.fn(),
  rectangle: vi.fn(),
  putText: vi.fn(),
  COLOR_RGBA2GRAY: 1,
  COLOR_BGR2HSV: 2,
  TM_CCOEFF_NORMED: 3,
  TM_CCORR_NORMED: 4,
  TM_SQDIFF_NORMED: 5,
};

describe("OpenCV initOpenCV", () => {
  beforeEach(() => {
    vi.resetModules();
    // clear global cv
    (globalThis as unknown as { cv?: MockCV }).cv = undefined;
  });

  afterEach(() => {
    // cleanup global cv
    delete (globalThis as unknown as { cv?: MockCV }).cv;
  });

  it("resolves when global cv exists", async () => {
    (globalThis as unknown as { cv?: MockCV }).cv = mockCv;
    const cv = await initOpenCV();
    expect(cv).toBeDefined();
    expect(cv.Mat).toBeDefined();
  });

  it("rejects when global cv is missing", async () => {
    await expect(initOpenCV()).rejects.toThrow(/OpenCV/);
  });
});