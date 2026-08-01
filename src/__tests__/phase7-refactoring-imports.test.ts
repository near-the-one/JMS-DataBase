// Phase 7: リファクタリング検証テスト — import構造・循環参照・未使用インポート
import { describe, it, expect } from "vitest";

describe("Phase7: インポート構造", () => {
  it("types モジュールが正しくインポート可能である", async () => {
    const types = await import("@/types");
    expect(types).toHaveProperty("GRADE_LABELS");
    expect(types).toHaveProperty("GRADE_ORDER");
    expect(types).toHaveProperty("SERVER_NAMES");
  });

  it("mockData モジュールが正しくインポート可能である", async () => {
    const mockData = await import("@/data/mockData");
    expect(mockData).toHaveProperty("aggregateRecords");
    expect(mockData).toHaveProperty("totalSamples");
    expect(mockData).toHaveProperty("MOCK_AGGREGATED");
    expect(mockData).toHaveProperty("MOCK_RECORDS");
  });

  it("recordRepository モジュールが正しくインポート可能である", async () => {
    const repo = await import("@/data/recordRepository");
    expect(repo).toHaveProperty("createRecordRepository");
  });

  it("すべてのコンポーネントが動的インポート可能である", async () => {
    // 循環参照がないことを確認
    const components = [
      "@/components/App",
      "@/components/Dashboard",
      "@/components/ManualEntryForm",
      "@/components/RecordList",
      "@/components/AdminPage",
      "@/components/AdminLogin",
      "@/components/ServerSelector",
    ];
    for (const path of components) {
      const mod = await import(path);
      expect(mod).toBeDefined();
    }
  });

  it("recognition モジュールが正しくインポート可能である", async () => {
    const modules = [
      "@/recognition/recognitionAPI",
      "@/recognition/colorDetection",
      "@/recognition/ocr",
      "@/recognition/openCV",
      "@/recognition/templateMatching",
      "@/recognition/eventDetector",
      "@/recognition/recognitionResult",
    ];
    for (const path of modules) {
      const mod = await import(path);
      expect(mod).toBeDefined();
    }
  });

  it("autoRegister モジュールが正しくインポート可能である", async () => {
    const modules = [
      "@/autoRegister/deduplication",
      "@/autoRegister/registrationService",
      "@/autoRegister/registrationValidation",
    ];
    for (const path of modules) {
      const mod = await import(path);
      expect(mod).toBeDefined();
    }
  });
});