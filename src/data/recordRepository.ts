import type { ManualEntryRecord } from "@/types";
import { SupabaseRecordRepository } from "@/infrastructure/repository/SupabaseRecordRepository";

export interface IRecordRepository {
  getAll(): Promise<ManualEntryRecord[]>;
  getById(id: number): Promise<ManualEntryRecord | undefined>;
  add(record: Omit<ManualEntryRecord, "id">): Promise<ManualEntryRecord>;
  delete(id: number): Promise<boolean>;
  count(): Promise<number>;
}

export function createRecordRepository(): IRecordRepository {
  // Supabase実装を返す（InMemoryRecordRepositoryはローカル開発/テスト用に別途残置）
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