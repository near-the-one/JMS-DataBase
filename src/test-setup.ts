import "@testing-library/jest-dom/vitest";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { InMemoryRecordRepository } from "@/data/recordRepository";

afterEach(() => {
  cleanup();
});

// Expose InMemoryRecordRepository globally for recordRepositoryAsync.test.ts
(globalThis as Record<string, unknown>).InMemoryRecordRepository = InMemoryRecordRepository;

// Mock SupabaseRecordRepository to use InMemoryRecordRepository in tests.
// The factory must be self-contained (no references to external variables), because vi.mock is hoisted.
vi.mock("@/infrastructure/repository/SupabaseRecordRepository", () => {
  type ManualEntryRecord = {
    id: number;
    server_name: string;
    potential_type: string;
    cube_type: string;
    grade_before: string;
    grade_after: string;
    quantity_used: number;
    character_name: string | null;
    timestamp: number;
    part?: string;
  };
  void ({} as ManualEntryRecord);
  return {
    SupabaseRecordRepository: class SupabaseRecordRepository {
      private records: ManualEntryRecord[] = [];
      private nextId = 1;

      async getAll(): Promise<ManualEntryRecord[]> {
        return [...this.records];
      }

      async getById(id: number): Promise<ManualEntryRecord | undefined> {
        return this.records.find((r) => r.id === id);
      }

      async add(input: Omit<ManualEntryRecord, "id">): Promise<ManualEntryRecord> {
        const record: ManualEntryRecord = {
          id: this.nextId++,
          ...input,
        };
        this.records.push(record);
        return record;
      }

      async update(
        id: number,
        input: Partial<Omit<ManualEntryRecord, "id">>,
      ): Promise<ManualEntryRecord> {
        const idx = this.records.findIndex((r) => r.id === id);
        if (idx === -1) throw new Error(`Record not found: id=${id}`);
        const existing = this.records[idx];
        const merged = { ...existing, ...input } as ManualEntryRecord;
        this.records[idx] = merged;
        return merged;
      }

      async delete(id: number): Promise<boolean> {
        const idx = this.records.findIndex((r) => r.id === id);
        if (idx === -1) return false;
        this.records.splice(idx, 1);
        return true;
      }

      async count(): Promise<number> {
        return this.records.length;
      }

      async getCubeUsageStats(): Promise<Array<{
        potential_type: string;
        cube_type: string;
        grade_transition: number;
        isMiracle: boolean;
        total_quantity: number;
        count: number;
        supply_rate: number;
      }>> {
        return [];
      }
    },
  };
});

// Create mock supabase client with all needed methods (for database operations only, not auth)
const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockResolvedValue({ data: [], error: null }),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
});

vi.mock("@/infrastructure/supabaseClient", () => ({
  supabase: {
    auth: {},
    from: mockFrom,
  },
}));

// Global polyfills for ImageData and Canvas in jsdom
if (typeof (globalThis as Record<string, unknown>).ImageData === "undefined") {
  class ImageDataPolyfill {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  }
  (globalThis as Record<string, unknown>).ImageData = ImageDataPolyfill as unknown;
}

// Mock getContext for HTMLCanvasElement
if (typeof HTMLCanvasElement !== "undefined") {
  // @ts-expect-error dummy for test environment – adding method to prototype for test environment
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      createImageData: (w: number, h: number) => {
        const ImgCtor = (globalThis as Record<string, unknown>).ImageData as unknown as { new (w: number, h: number): ImageData };
        return new ImgCtor(w, h);
      },
      putImageData: () => {},
    };
  } as unknown;
}

// Helper used in templateMatching tests
function createMockImage(width: number, height: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  return ctx?.createImageData(width, height) ?? new ((globalThis as Record<string, unknown>).ImageData as unknown as { new (w: number, h: number): ImageData })(width, height);
}

// Expose globally for test files
(globalThis as Record<string, unknown>).createMockImage = createMockImage as unknown;

// Global fill helper for App.test.tsx "2件登録すると2つ表示される" test
(globalThis as Record<string, unknown>).fill = async (cubeFn: () => string) => {
  const { screen, within, fireEvent, waitFor } = await import("@testing-library/react");
  const cube = cubeFn();
  const form = within(screen.getByTestId("manual-entry-form"));
  fireEvent.change(form.getByLabelText(/キューブ/), {
    target: { value: cube },
  });
  fireEvent.change(form.getByLabelText(/使用個数/), {
    target: { value: "3" },
  });
  fireEvent.click(form.getByRole("button", { name: /登録/ }));
  await waitFor(() => {
    expect(form.getByRole("button", { name: /登録/ })).toBeTruthy();
  });
};

// Mock useCubeStats hook for tests
vi.mock("@/hooks/useCubeStats", () => ({
  useCubeStats: () => ({
    data: {
      stats: [
        // All three grade transitions for each cube type to match probStats fixedTransitions
        { potential_type: "potential", cube_type: "neo", grade_transition: 3, grade_transition_label: "ユニーク → レジェンダリー", is_miracle: false, total_quantity: 100, count: 10, supply_rate: 10 },
        { potential_type: "potential", cube_type: "neo", grade_transition: 2, grade_transition_label: "エピック → ユニーク", is_miracle: false, total_quantity: 100, count: 10, supply_rate: 10 },
        { potential_type: "potential", cube_type: "neo", grade_transition: 1, grade_transition_label: "レア → エピック", is_miracle: false, total_quantity: 100, count: 10, supply_rate: 10 },
        { potential_type: "potential", cube_type: "mega", grade_transition: 3, grade_transition_label: "ユニーク → レジェンダリー", is_miracle: false, total_quantity: 100, count: 10, supply_rate: 10 },
        { potential_type: "potential", cube_type: "mega", grade_transition: 2, grade_transition_label: "エピック → ユニーク", is_miracle: false, total_quantity: 100, count: 10, supply_rate: 10 },
        { potential_type: "potential", cube_type: "mega", grade_transition: 1, grade_transition_label: "レア → エピック", is_miracle: false, total_quantity: 100, count: 10, supply_rate: 10 },
        { potential_type: "additional_potential", cube_type: "neo_additional", grade_transition: 3, grade_transition_label: "ユニーク → レジェンダリー", is_miracle: false, total_quantity: 100, count: 10, supply_rate: 10 },
        { potential_type: "additional_potential", cube_type: "neo_additional", grade_transition: 2, grade_transition_label: "エピック → ユニーク", is_miracle: false, total_quantity: 100, count: 10, supply_rate: 10 },
        { potential_type: "additional_potential", cube_type: "neo_additional", grade_transition: 1, grade_transition_label: "レア → エピック", is_miracle: false, total_quantity: 100, count: 10, supply_rate: 10 },
      ],
      meta: {
        generated_at: new Date().toISOString(),
        data_period_start: new Date().toISOString(),
        data_period_end: new Date().toISOString(),
        total_records: 90,
        cache_hint: { max_age: 300, stale_while_revalidate: 600 },
      },
    },
    isLoading: false,
    error: null,
    lastFetched: null,
    refetch: vi.fn(),
  }),
}));