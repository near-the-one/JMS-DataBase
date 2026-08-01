import type { ManualEntryRecord } from "@/types";
import { SupabaseRecordRepository } from "@/infrastructure/repository/SupabaseRecordRepository";

export interface IRecordRepository {
  getAll(): Promise<ManualEntryRecord[]>;
  getById(id: number): Promise<ManualEntryRecord | undefined>;
  add(record: Omit<ManualEntryRecord, "id">): Promise<ManualEntryRecord>;
  update(
    id: number,
    record: Partial<Omit<ManualEntryRecord, "id">>,
  ): Promise<ManualEntryRecord>;
  delete(id: number): Promise<boolean>;
  count(): Promise<number>;
}

export function createRecordRepository(): IRecordRepository {
  // 一時的にインメモリ実装を使用（Supabase 未設定のため）
  return new SupabaseRecordRepository();
}

export class InMemoryRecordRepository implements IRecordRepository {
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
}