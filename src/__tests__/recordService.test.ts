import { describe, it, expect, beforeEach } from "vitest";
import type { ManualEntryInput } from "@/components/ManualEntryForm";
import type { ServerName, PotentialType, CubeType, Grade } from "@/types";

/**
 * Phase1 の実装ターゲットとなる Service クラス。
 * ManualEntryForm から分離して実装される想定。
 */
export interface ValidationError {
  field: string;
  message: string;
}

class RecordService {
  validate(input: ManualEntryInput): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!input.server_name) {
      errors.push({ field: "server_name", message: "サーバーは必須です" });
    }
    if (!input.potential_type) {
      errors.push({
        field: "potential_type",
        message: "潜在能力種別は必須です",
      });
    }
    if (!input.cube_type) {
      errors.push({ field: "cube_type", message: "キューブ種類は必須です" });
    }
    if (!input.grade_before) {
      errors.push({ field: "grade_before", message: "開始等級は必須です" });
    }
    if (!input.grade_after) {
      errors.push({ field: "grade_after", message: "終了等級は必須です" });
    }
    if (input.quantity_used < 1) {
      errors.push({
        field: "quantity_used",
        message: "使用個数は1以上で入力してください",
      });
    }

    // 等級遷移のバリデーション: 降級していないこと
    if (input.grade_before && input.grade_after) {
      const gradeOrder: Record<Grade, number> = {
        rare: 0,
        epic: 1,
        unique: 2,
        legendary: 3,
      };
      const before = gradeOrder[input.grade_before];
      const after = gradeOrder[input.grade_after];
      if (before > after) {
        errors.push({
          field: "grade_after",
          message: "等級が逆遷移しています",
        });
      }
    }

    return errors;
  }

  isValid(input: ManualEntryInput): boolean {
    return this.validate(input).length === 0;
  }
}

/** テスト用ヘルパー: バリデーションが通る有効な入力 */
function validInput(overrides?: Partial<ManualEntryInput>): ManualEntryInput {
  return {
    server_name: "かえで",
    potential_type: "potential",
    cube_type: "neo",
    grade_before: "rare",
    grade_after: "epic",
    quantity_used: 1,
    is_miracle_time: false,
    character_name: null,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("Phase1: RecordService（バリデーション）", () => {
  let service: RecordService;

  beforeEach(() => {
    service = new RecordService();
  });

  describe("正常系：有効な入力", () => {
    it("全項目正しく入力されていればエラー0件", () => {
      const errors = service.validate(validInput());
      expect(errors).toHaveLength(0);
    });

    it("isValid が true を返すこと", () => {
      expect(service.isValid(validInput())).toBe(true);
    });

    it("使用個数1は有効", () => {
      const errors = service.validate(validInput({ quantity_used: 1 }));
      expect(errors).toHaveLength(0);
    });

    it("使用個数100は有効", () => {
      const errors = service.validate(validInput({ quantity_used: 100 }));
      expect(errors).toHaveLength(0);
    });

    it("同じ等級への遷移（rare→rare）も有効", () => {
      const errors = service.validate(
        validInput({ grade_before: "rare", grade_after: "rare" }),
      );
      expect(errors).toHaveLength(0);
    });

    it("最上位への遷移（unique→legendary）も有効", () => {
      const errors = service.validate(
        validInput({ grade_before: "unique", grade_after: "legendary" }),
      );
      expect(errors).toHaveLength(0);
    });

    it("character_name が null でも有効", () => {
      const errors = service.validate(validInput({ character_name: null }));
      expect(errors).toHaveLength(0);
    });

    it("character_name に文字列があっても有効", () => {
      const errors = service.validate(validInput({ character_name: "さくら" }));
      expect(errors).toHaveLength(0);
    });

    it("is_miracle_time=true でも有効", () => {
      const errors = service.validate(validInput({ is_miracle_time: true }));
      expect(errors).toHaveLength(0);
    });

    it("アディショナル潜在能力・ネオアディショナルキューブも有効", () => {
      const errors = service.validate(
        validInput({
          potential_type: "additional_potential",
          cube_type: "neo_additional",
          grade_before: "epic",
          grade_after: "unique",
        }),
      );
      expect(errors).toHaveLength(0);
    });
  });

  describe("必須項目チェック", () => {
    it("server_name が空の場合エラー", () => {
      const errors = service.validate(
        validInput({ server_name: "" as ServerName }),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("server_name");
    });

    it("potential_type が空の場合エラー", () => {
      const errors = service.validate(
        validInput({ potential_type: "" as PotentialType }),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("potential_type");
    });

    it("cube_type が空の場合エラー", () => {
      const errors = service.validate(
        validInput({ cube_type: "" as CubeType }),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("cube_type");
    });

    it("grade_before が空の場合エラー", () => {
      const errors = service.validate(
        validInput({ grade_before: "" as Grade }),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("grade_before");
    });

    it("grade_after が空の場合エラー", () => {
      const errors = service.validate(
        validInput({ grade_after: "" as Grade }),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("grade_after");
    });
  });

  describe("使用個数バリデーション", () => {
    it("使用個数0はエラー", () => {
      const errors = service.validate(validInput({ quantity_used: 0 }));
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("quantity_used");
    });

    it("使用個数が負の値はエラー", () => {
      const errors = service.validate(validInput({ quantity_used: -1 }));
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("quantity_used");
    });
  });

  describe("等級遷移バリデーション", () => {
    it("降級（epic→rare）はエラー", () => {
      const errors = service.validate(
        validInput({ grade_before: "epic", grade_after: "rare" }),
      );
      const gradeErr = errors.find((e) => e.field === "grade_after");
      expect(gradeErr).toBeDefined();
      expect(gradeErr!.message).toContain("等級");
    });

    it("降級（legendary→unique）はエラー", () => {
      const errors = service.validate(
        validInput({ grade_before: "legendary", grade_after: "unique" }),
      );
      const gradeErr = errors.find((e) => e.field === "grade_after");
      expect(gradeErr).toBeDefined();
    });

    it("昇級（rare→epic）はエラーなし", () => {
      const errors = service.validate(
        validInput({ grade_before: "rare", grade_after: "epic" }),
      );
      expect(errors).toHaveLength(0);
    });

    it("同等級（unique→unique）はエラーなし", () => {
      const errors = service.validate(
        validInput({ grade_before: "unique", grade_after: "unique" }),
      );
      expect(errors).toHaveLength(0);
    });
  });

  describe("複合エラー", () => {
    it("複数の必須項目が空の場合、複数のエラーが返ること", () => {
      const errors = service.validate({
        ...validInput(),
        server_name: "" as ServerName,
        quantity_used: 0,
      });
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });

    it("全項目が不正な場合でも全エラーが列挙されること", () => {
      const errors = service.validate({
        server_name: "" as ServerName,
        potential_type: "" as PotentialType,
        cube_type: "" as CubeType,
        grade_before: "" as Grade,
        grade_after: "" as Grade,
        quantity_used: 0,
        is_miracle_time: false,
        character_name: null,
        timestamp: 0,
      });
      expect(errors.length).toBeGreaterThanOrEqual(6);
    });
  });
});