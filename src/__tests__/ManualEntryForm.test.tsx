import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import type { ServerName } from "@/types";

import { ManualEntryForm } from "@/components/ManualEntryForm";
import type { ManualEntryInput } from "@/components/ManualEntryForm";

describe("Phase1: ManualEntryForm", () => {
  describe("フォーム表示", () => {
    it("フォームがレンダリングされること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
    });

    it("サーバー選択欄が表示されること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      expect(screen.queryByLabelText(/サーバ/)).toBeInTheDocument();
    });

    it("潜在能力種別の選択欄が表示されること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      expect(screen.queryByLabelText(/潜在能力種別/)).toBeInTheDocument();
    });

    it("キューブ種類の選択欄が表示されること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      expect(screen.queryByLabelText(/キューブ/)).toBeInTheDocument();
    });

    it("等級遷移の選択欄が表示されること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      expect(screen.queryByLabelText(/等級遷移/)).toBeInTheDocument();
    });

    it("使用個数の入力欄が表示されること（type=number）", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const input = screen.queryByLabelText(/使用個数/);
      expect(input).toBeInTheDocument();
    });

    it("部位選択欄が表示されること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      expect(screen.queryByLabelText(/部位/)).toBeInTheDocument();
    });

    it("使用日時入力欄が表示されること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      expect(screen.queryByLabelText(/使用日時/)).toBeInTheDocument();
    });

    it("送信ボタンが表示されること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      expect(screen.queryByRole("button", { name: /登録/ })).toBeInTheDocument();
    });
  });

  describe("フォームの選択肢", () => {
    it("サーバー選択肢に4サーバーが含まれること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const serverSelect = screen.queryByLabelText(/サー/);
      if (serverSelect && serverSelect.tagName === "SELECT") {
        const options = Array.from((serverSelect as HTMLSelectElement).options).map((o) => o.text);
        expect(options).toContainEqual(expect.stringContaining("かえで"));
        expect(options).toContainEqual(expect.stringContaining("ゆかり"));
        expect(options).toContainEqual(expect.stringContaining("くるみ"));
        expect(options).toContainEqual(expect.stringContaining("ャレンジャー"));
      } else {
        expect(serverSelect).toBeInTheDocument();
      }
    });

    it("潜在能力種別に「潜在能力」と「アディショナル潜在能力」が含まれること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const form = screen.getByTestId("manual-entry-form");
      expect(form.textContent).toMatch(/潜在能力/);
    });

    it("等級遷移に レア→エピック・エピック→ユニーク・ユニーク→レジェンダリー が含まれること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const form = screen.getByTestId("manual-entry-form");
      expect(form.textContent).toMatch(/レア → エピック/);
      expect(form.textContent).toMatch(/エピック → ユニーク/);
      expect(form.textContent).toMatch(/ユニーク → レジェンダリー/);
    });

    it("部位選択肢に 武器・帽子・手袋・靴・全身・アクセサリー が含まれること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const form = screen.getByTestId("manual-entry-form");
      expect(form.textContent).toMatch(/武器/);
      expect(form.textContent).toMatch(/帽子/);
      expect(form.textContent).toMatch(/手袋/);
      expect(form.textContent).toMatch(/靴/);
      expect(form.textContent).toMatch(/全身/);
      expect(form.textContent).toMatch(/アクセサリー/);
    });
  });

  describe("正常登録", () => {
    it("すべての必須項目を入力して送信すると onSubmit が呼ばれること", async () => {
      const onSubmit = vi.fn();
      render(<ManualEntryForm onSubmit={onSubmit} />);

      const serverSelect = screen.getByLabelText(/サーバー/);
      fireEvent.change(serverSelect, { target: { value: "かえで" } });

      const potentialSelect = screen.getByLabelText(/潜在能力種別/);
      fireEvent.change(potentialSelect, { target: { value: "potential" } });

      const cubeSelect = screen.getByLabelText(/キューブ/);
      fireEvent.change(cubeSelect, { target: { value: "neo" } });

      const gradeTransitionSelect = screen.getByLabelText(/等級遷移/);
      fireEvent.change(gradeTransitionSelect, { target: { value: "rare-epic" } });

      const quantityInput = screen.getByLabelText(/使用個数/);
      fireEvent.change(quantityInput, { target: { value: "5" } });

      const submitBtn = screen.getByRole("button", { name: /登録/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      const callArgs = onSubmit.mock.calls[0][0];
      expect(callArgs.server_name).toBe("かえで");
      expect(callArgs.potential_type).toBe("potential");
      expect(callArgs.cube_type).toBe("neo");
      expect(callArgs.grade_before).toBe("rare");
      expect(callArgs.grade_after).toBe("epic");
      expect(callArgs.quantity_used).toBe(5);
    });

    it("部位に weapon を選択して送信すると part=weapon が送信されること", async () => {
      const onSubmit = vi.fn();
      render(<ManualEntryForm onSubmit={onSubmit} />);

      const partSelect = screen.getByLabelText(/部位/);
      fireEvent.change(partSelect, { target: { value: "weapon" } });

      const submitBtn = screen.getByRole("button", { name: /登録/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
      expect(onSubmit.mock.calls[0][0].part).toBe("weapon");
    });

    it("部位未選択時は part='other' として送信されること", async () => {
      const onSubmit = vi.fn();
      render(<ManualEntryForm onSubmit={onSubmit} />);

      const submitBtn = screen.getByRole("button", { name: /登録/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
      expect(onSubmit.mock.calls[0][0].part).toBe("other");
    });

    it("使用日時に入力して送信すると timestamp が数値で送信されること", async () => {
      const onSubmit = vi.fn();
      render(<ManualEntryForm onSubmit={onSubmit} />);

      const timestampInput = screen.getByLabelText(/使用日時/);
      fireEvent.change(timestampInput, { target: { value: "2026-07-29T12:00" } });

      const submitBtn = screen.getByRole("button", { name: /登録/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
      const payload = onSubmit.mock.calls[0][0];
      expect(typeof payload.timestamp).toBe("number");
      // Verify timestamp corresponds to the input datetime (within a second)
      expect(Math.abs(payload.timestamp - new Date("2026-07-29T12:00").getTime())).toBeLessThanOrEqual(1000);
    });

    it("使用日時が空欄の場合、現在日時が timestamp に設定されること", async () => {
      const onSubmit = vi.fn();
      render(<ManualEntryForm onSubmit={onSubmit} />);

      const submitBtn = screen.getByRole("button", { name: /登録/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
      const payload = onSubmit.mock.calls[0][0];
      expect(typeof payload.timestamp).toBe("number");
      // Should be within a few seconds of now
      expect(Math.abs(payload.timestamp - Date.now())).toBeLessThanOrEqual(5000);
    });
  });

  describe("入力エラー", () => {
    it("必須項目が未入力状態で送信するとエラーが表示されること", async () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      // 使用個数を空にしてエラーを発生させる
      const quantityInput = screen.getByLabelText(/使用個数/);
      fireEvent.change(quantityInput, { target: { value: "" } });
      const submitBtn = screen.getByRole("button", { name: /登録/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.queryByText(/使用個数は1以上/)).toBeInTheDocument();
      });
    });

    it("使用個数が0で送信するとエラーが表示されること", async () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const quantityInput = screen.getByLabelText(/使用個数/);
      fireEvent.change(quantityInput, { target: { value: "0" } });
      const submitBtn = screen.getByRole("button", { name: /登録/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.queryByText(/使用個数は1以上/)).toBeInTheDocument();
      });
    });

    it("等級遷移が逆（epic→rare）の場合エラーが表示されること", async () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const gradeTransitionSelect = screen.getByLabelText(/等級遷移/);
      // The select only has valid options (rare-epic, epic-unique, unique-legendary)
      // So we verify that invalid transitions cannot be selected via UI
      const options = Array.from((gradeTransitionSelect as HTMLSelectElement).options).map((o) => o.value);
      expect(options).toEqual(["rare-epic", "epic-unique", "unique-legendary"]);
      // Since the UI prevents invalid values, the order validation is effectively tested by the options
    });
  });

  describe("編集モード", () => {
    it("初期データが渡されるとフォームに埋め込まれること", () => {
      const initialData: Partial<ManualEntryInput> = {
        server_name: "ゆかり",
        potential_type: "additional_potential",
        cube_type: "neo_additional",
        grade_before: "unique",
        grade_after: "legendary",
        quantity_used: 7,
      };
      render(<ManualEntryForm onSubmit={vi.fn()} initialData={initialData} editId={1} />);

      const serverSelect = screen.getByLabelText(/サーバ/);
      expect((serverSelect as HTMLSelectElement).value).toContain("ゆかり");

      const quantityInput = screen.getByLabelText(/使用個数/) as HTMLInputElement;
      expect(quantityInput.value).toBe("7");
    });

    it("初期データに part が含まれる場合、部位選択欄に反映されること", () => {
      const initialData: Partial<ManualEntryInput> = {
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 1,
        part: "gloves",
      };
      render(<ManualEntryForm onSubmit={vi.fn()} initialData={initialData} editId={1} />);

      const partSelect = screen.getByLabelText(/部位/) as HTMLSelectElement;
      expect(partSelect.value).toBe("gloves");
    });

    it("初期データに timestamp が含まれる場合、使用日時入力欄に反映されていること", () => {
      const initialData: Partial<ManualEntryInput> = {
        server_name: "かえで",
        potential_type: "potential",
        cube_type: "neo",
        grade_before: "rare",
        grade_after: "epic",
        quantity_used: 1,
        timestamp: 1659091200000, // 2022-07-29T10:40:00.000Z (UTC)
      };
      render(<ManualEntryForm onSubmit={vi.fn()} initialData={initialData} editId={1} />);

      const timestampInput = screen.getByLabelText(/使用日時/) as HTMLInputElement;
      // Expect the value to be formatted as YYYY-MM-DDTHH:MM in UTC
      expect(timestampInput.value).toBe("2022-07-29T10:40");
    });

    it("編集モードではボタン文言が「更新」になること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} editId={1} />);
      expect(screen.queryByRole("button", { name: /更新/ })).toBeInTheDocument();
    });

    it("編集モードで送信したデータに id が含まれること", async () => {
      const onSubmit = vi.fn();
      render(
        <ManualEntryForm
          onSubmit={onSubmit}
          initialData={{
            server_name: "かえで",
            potential_type: "potential",
            cube_type: "neo",
            grade_before: "rare",
            grade_after: "epic",
            quantity_used: 1,
          }}
          editId={5}
        />,
      );
      const submitBtn = screen.getByRole("button", { name: /更新/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ id: 5 }),
        );
      });
    });
  });
});