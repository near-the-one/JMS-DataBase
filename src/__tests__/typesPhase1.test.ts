import { describe, it, expect } from "vitest";
import {
  GRADE_ORDER,
  GRADE_LABELS,
  SERVER_NAMES,
  type CubeType,
  type Grade,
  type PotentialType,
  type ServerName,
  type CubeUsageRecord,
} from "@/types";

describe("Phase1: 型定義（登録フォーム用の拡張）", () => {
  describe("既存の型が維持されていること", () => {
    it("GRADE_ORDER が昇順になっていること", () => {
      expect(GRADE_ORDER).toEqual(["rare", "epic", "unique", "legendary"]);
    });

    it("GRADE_LABELS が4等級すべて定義されていること", () => {
      expect(GRADE_LABELS).toEqual({
        rare: "レア",
        epic: "エピック",
        unique: "ユニーク",
        legendary: "レジェンダリー",
      });
    });

    it("SERVER_NAMES が4サーバーすべて定義されていること", () => {
      expect(SERVER_NAMES).toEqual(["かえで", "ゆかり", "くるみ", "チャレンジャーズ"]);
    });
  });

  describe("CubeUsageRecord（拡張後）", () => {
    it("Phase 1: potential_type, server_name, is_miracle_time を含むすべての必須フィールドを持つこと", () => {
      const record: CubeUsageRecord = {
        id: 1,
        date: "2026-07-01",
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 10,
        upgraded: true,
        is_miracle_time: false,
      };
      expect(typeof record.id).toBe("number");
      expect(record.server_name).toBe("かえで");
      expect(record.potential_type).toBe("potential");
      expect(record.is_miracle_time).toBe(false);
      expect(record.upgraded).toBe(true);
      expect(record.date).toBe("2026-07-01");
    });

    it("cube_type に 'neo' | 'mega' | 'neo_additional' が指定できること", () => {
      const neo: CubeType = "neo";
      const mega: CubeType = "mega";
      const additional: CubeType = "neo_additional";
      expect([neo, mega, additional]).toEqual(["neo", "mega", "neo_additional"]);
    });

    it("grade_before / grade_after に Grade が指定できること", () => {
      const grades: Grade[] = ["rare", "epic", "unique", "legendary"];
      expect(grades).toHaveLength(4);
    });

    it("quantity_used: number を持つこと", () => {
      const record: CubeUsageRecord = {
        id: 1,
        date: "2026-07-01",
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "rare",
        quantity_used: 5,
        upgraded: false,
        is_miracle_time: false,
      };
      expect(record.quantity_used).toBe(5);
    });

    it("is_miracle_time が false のレコードと true のレコードの両方が構築できること", () => {
      const normalRecord: CubeUsageRecord = {
        id: 1,
        date: "2026-07-01",
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 5,
        upgraded: false,
        is_miracle_time: false,
      };
      const miracleRecord: CubeUsageRecord = {
        id: 2,
        date: "2025-11-01",
        server_name: "ゆかり",
        potential_type: "additional_potential",
        cube_type: "neo_additional",
        grade_before: "unique",
        grade_after: "legendary",
        quantity_used: 3,
        upgraded: true,
        is_miracle_time: true,
      };
      expect(normalRecord.is_miracle_time).toBe(false);
      expect(miracleRecord.is_miracle_time).toBe(true);
    });
  });
});

describe("Phase1: 手入力用 EntryFormRecord 型（新規追加予定）", () => {
  // Phase 1: ManualEntryInput の型定義。part? と used_at? を含む。
  // ManualEntryForm.tsx の ManualEntryInput と整合すること。
  type ManualEntryInput = {
    server_name: ServerName;
    potential_type: PotentialType;
    cube_type: CubeType;
    grade_before: Grade;
    grade_after: Grade;
    quantity_used: number;
    is_miracle_time: boolean;
    character_name: string | null;
    timestamp: number;
    part?: string;
    used_at?: string;
  };

  it("すべての必須フィールドを持つこと", () => {
    const input: ManualEntryInput = {
      server_name: "かえで",
      potential_type: "potential",
      cube_type: "neo",
      grade_before: "rare",
      grade_after: "epic",
      quantity_used: 1,
      is_miracle_time: false,
      character_name: null,
      timestamp: Date.now(),
    };

    expect(input.server_name).toBe("かえで");
    expect(input.potential_type).toBe("potential");
    expect(input.cube_type).toBe("neo");
    expect(input.grade_before).toBe("rare");
    expect(input.grade_after).toBe("epic");
    expect(input.quantity_used).toBe(1);
    expect(input.is_miracle_time).toBe(false);
    expect(input.character_name).toBeNull();
    expect(typeof input.timestamp).toBe("number");
  });

  it("Phase 1: part と used_at のオプショナルフィールドがあること", () => {
    const input: ManualEntryInput = {
      server_name: "かえで",
      potential_type: "potential",
      cube_type: "neo",
      grade_before: "rare",
      grade_after: "epic",
      quantity_used: 1,
      is_miracle_time: false,
      character_name: null,
      timestamp: Date.now(),
      part: "weapon",
      used_at: "2026/07/29 12:00",
    };
    expect(input.part).toBe("weapon");
    expect(input.used_at).toBe("2026/07/29 12:00");
  });

  it("part 選択肢は weapon / hat / gloves / shoes / overall / accessory であること", () => {
    const validParts = ["weapon", "hat", "gloves", "shoes", "overall", "accessory"];
    for (const part of validParts) {
      const input: ManualEntryInput = {
        server_name: "くるみ",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 1,
        is_miracle_time: false,
        character_name: null,
        timestamp: 0,
        part,
      };
      expect(input.part).toBe(part);
    }
  });

  it("part 未選択時に other に置き換えられることの型確認", () => {
    const input: ManualEntryInput = {
      server_name: "くるみ",
      potential_type: "potential",
      cube_type: "mega",
      grade_before: "rare",
      grade_after: "epic",
      quantity_used: 1,
      is_miracle_time: false,
      character_name: null,
      timestamp: 0,
      part: "other",
    };
    expect(input.part).toBe("other");
  });

  it("used_at が空欄でも型上は受け入れられること", () => {
    const input: ManualEntryInput = {
      server_name: "くるみ",
      potential_type: "potential",
      cube_type: "mega",
      grade_before: "rare",
      grade_after: "epic",
      quantity_used: 1,
      is_miracle_time: false,
      character_name: null,
      timestamp: 0,
      used_at: "",
    };
    expect(input.used_at).toBe("");
  });

  it("server_name は4サーバーのいずれかであること", () => {
    for (const server of SERVER_NAMES) {
      const input: ManualEntryInput = {
        server_name: server,
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 1,
        is_miracle_time: false,
        character_name: null,
        timestamp: 0,
      };
      expect(SERVER_NAMES).toContain(input.server_name);
    }
  });

  it("potential_type は 'potential' または 'additional_potential' であること", () => {
    const types: PotentialType[] = ["potential", "additional_potential"];
    const input1: ManualEntryInput = {
      server_name: "かえで",
      potential_type: "potential",
      cube_type: "neo",
      grade_before: "rare",
      grade_after: "epic",
      quantity_used: 1,
      is_miracle_time: false,
      character_name: null,
      timestamp: 0,
    };
    const input2: ManualEntryInput = {
      server_name: "ゆかり",
      potential_type: "additional_potential",
      cube_type: "neo_additional",
      grade_before: "epic",
      grade_after: "unique",
      quantity_used: 5,
      is_miracle_time: true,
      character_name: "さくら",
      timestamp: 1700000000000,
    };
    expect(types).toContain(input1.potential_type);
    expect(types).toContain(input2.potential_type);
  });

  it("grade_before と grade_after は GRADE_ORDER 内の値であること", () => {
    const input: ManualEntryInput = {
      server_name: "くるみ",
      potential_type: "potential",
      cube_type: "mega",
      grade_before: "unique",
      grade_after: "legendary",
      quantity_used: 3,
      is_miracle_time: false,
      character_name: null,
      timestamp: 0,
    };
    expect(GRADE_ORDER).toContain(input.grade_before);
    expect(GRADE_ORDER).toContain(input.grade_after);
  });
});