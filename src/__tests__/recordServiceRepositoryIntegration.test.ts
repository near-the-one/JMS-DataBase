// Integration test for RecordRepository and RecordService
import { describe, it, expect, beforeEach } from "vitest";
import { createRecordRepository } from "@/data/recordRepository";
import type { ManualEntryRecord } from "@/types";

// Inline simple validation service similar to existing test
class SimpleRecordService {
  validate(record: Omit<ManualEntryRecord, "id">) {
    const errors: string[] = [];
    if (!record.server_name) errors.push("server_name");
    if (record.quantity_used < 1) errors.push("quantity_used");
    return errors;
  }
}

describe("RecordRepository + SimpleRecordService integration", () => {
  let repo: ReturnType<typeof createRecordRepository>;
  let service: SimpleRecordService;

  beforeEach(() => {
    repo = createRecordRepository();
    service = new SimpleRecordService();
  });

  it("add validates then stores record", async () => {
    const input = {
      server_name: "かえで",
      potential_type: "potential" as const,
      cube_type: "neo" as const,
      grade_before: "rare" as const,
      grade_after: "epic" as const,
      quantity_used: 5,
      is_miracle_time: false,
      character_name: null,
      timestamp: Date.now(),
    };
    expect(service.validate(input)).toHaveLength(0);
    const saved = await repo.add(input);
    expect(saved.id).toBeGreaterThan(0);
    expect(await repo.count()).toBe(1);
  });

  it("invalid record is rejected by service before repo", () => {
    const bad = {
      server_name: "",
      potential_type: "potential" as const,
      cube_type: "neo" as const,
      grade_before: "rare" as const,
      grade_after: "epic" as const,
      quantity_used: 0,
      is_miracle_time: false,
      character_name: null,
      timestamp: Date.now(),
    };
    const errors = service.validate(bad);
    expect(errors).toContain("server_name");
    expect(errors).toContain("quantity_used");
    // repository should not be used for invalid data in this flow
  });

  it("update and delete work after add", async () => {
    const record = await repo.add({
      server_name: "ゆかり",
      potential_type: "additional_potential" as const,
      cube_type: "neo_additional" as const,
      grade_before: "unique" as const,
      grade_after: "legendary" as const,
      quantity_used: 3,
      is_miracle_time: true,
      character_name: "さくら",
      timestamp: Date.now(),
    });
    const updated = await repo.update(record.id, { quantity_used: 10 });
    expect(updated.quantity_used).toBe(10);
    const del = await repo.delete(record.id);
    expect(del).toBe(true);
    expect(await repo.getById(record.id)).toBeUndefined();
  });
});