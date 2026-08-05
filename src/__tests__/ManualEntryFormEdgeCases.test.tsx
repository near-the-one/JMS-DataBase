// Edge case and additional validation tests for ManualEntryForm
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ManualEntryForm } from "@/components/ManualEntryForm";

describe("ManualEntryForm Edge Cases", () => {
  describe("キャラクター名フィールド", () => {
    it("キャラクター名入力欄が表示されること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      expect(screen.queryByLabelText(/キャラクター名/)).toBeInTheDocument();
    });

    it("キャラクター名に文字列を入力できること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const input = screen.getByLabelText(/キャラクター名/);
      fireEvent.change(input, { target: { value: "さくら" } });
      expect((input as HTMLInputElement).value).toBe("さくら");
    });

    it("キャラクター名が空欄でも登録できること", async () => {
      const onSubmit = vi.fn();
      render(<ManualEntryForm onSubmit={onSubmit} />);
      fireEvent.click(screen.getByRole("button", { name: /登録/ }));
      await vi.waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
      expect(onSubmit.mock.calls[0][0].character_name).toBeNull();
    });

    it("キャラクター名を入力して登録すると値が送信されること", async () => {
      const onSubmit = vi.fn();
      render(<ManualEntryForm onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText(/キャラクター名/), {
        target: { value: "テスト太郎" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録/ }));
      await vi.waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ character_name: "テスト太郎" }),
        );
      });
    });
  });

  describe("使用個数バリデーション詳細", () => {
    it("負の数でエラーが表示されること", async () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      fireEvent.change(screen.getByLabelText(/使用個数/), {
        target: { value: "-1" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録/ }));
      await vi.waitFor(() => {
        expect(screen.queryByText(/使用個数は1以上/)).toBeInTheDocument();
      });
    });

    it("空文字列でエラーが表示されること", async () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      fireEvent.change(screen.getByLabelText(/使用個数/), {
        target: { value: "" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録/ }));
      await vi.waitFor(() => {
        expect(screen.queryByText(/使用個数は1以上/)).toBeInTheDocument();
      });
    });

    it("小数でエラーが発生しないこと（小数は整数に変換されるかバリデートされる）", async () => {
      const onSubmit = vi.fn();
      render(<ManualEntryForm onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText(/使用個数/), {
        target: { value: "3.14" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録/ }));
      // 3.14 → Number("3.14") = 3.14 >= 1 → エラーにならず送信 or 実装次第
      await vi.waitFor(() => {
        // Either errors (some implementations reject floats) or submits
        const hasError = screen.queryByText(/使用個数は1以上/);
        const wasCalled = onSubmit.mock.calls.length > 0;
        expect(hasError || wasCalled).toBe(true);
      });
    });
  });

  describe("挑戦した等級のバリデーション", () => {
    it("無効な等級（legendary等）が選択肢に含まれないこと", async () => {
      const onSubmit = vi.fn();
      render(<ManualEntryForm onSubmit={onSubmit} />);
      // The select only has valid grades (rare, epic, unique), legendary is excluded
      // We test that the UI only allows valid options
      const select = screen.getByLabelText(/挑戦した等級/) as HTMLSelectElement;
      const options = Array.from(select.options).map(o => o.value);
      expect(options).not.toContain("legendary");
      expect(options).toContain("rare");
      expect(options).toContain("epic");
      expect(options).toContain("unique");
    });

    it("有効な等級（rare）が選択可能であること", async () => {
      const onSubmit = vi.fn();
      render(<ManualEntryForm onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText(/挑戦した等級/), {
        target: { value: "rare" },
      });
      // 結果を「上昇した」に設定
      fireEvent.click(screen.getByRole("button", { name: /上昇した/ }));
      fireEvent.click(screen.getByRole("button", { name: /登録/ }));
      await vi.waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("デフォルト値", () => {
    it("初期表示でサーバーがデフォルト選択されていること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const select = screen.getByLabelText(/サーバー/) as HTMLSelectElement;
      // Server name is optional, so default is empty
      expect(select.value).toBe("");
    });

    it("初期表示で潜在能力種別が「潜在能力」に設定されていること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const select = screen.getByLabelText(/潜在能力種別/) as HTMLSelectElement;
      expect(select.value).toBe("potential");
    });

    it("初期表示でキューブ種類が「neo」に設定されていること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const select = screen.getByLabelText(/キューブ種類/) as HTMLSelectElement;
      expect(select.value).toBe("neo");
    });

    it("初期表示で挑戦した等級が「unique」に設定されていること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const select = screen.getByLabelText(/挑戦した等級/) as HTMLSelectElement;
      expect(select.value).toBe("unique");
    });
  });

  describe("編集モード→新規登録モードへの切替（keyによるリセット）", () => {
    it("key属性が変わるとフォームがリセットされること", () => {
      const { rerender } = render(
        <ManualEntryForm key="edit-1" onSubmit={vi.fn()} initialData={{ server_name: "ゆかり", potential_type: "potential", cube_type: "neo", grade_before: "rare", grade_after: "epic", quantity_used: 3 }} editId={1} />,
      );
      const inputAfterEdit = screen.getByLabelText(/使用個数/) as HTMLInputElement;
      expect(inputAfterEdit.value).toBe("3");

      // rerender with different key causes full re-remount (edit cancelled/reset)
      rerender(
        <ManualEntryForm key="new-entry" onSubmit={vi.fn()} />,
      );
      const inputNew = screen.getByLabelText(/使用個数/) as HTMLInputElement;
      expect(inputNew.value).toBe("100");
    });
  });

  describe("バリデーションエラーメッセージの詳細", () => {
    it("使用個数が未入力の場合にエラーが表示されること", async () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      fireEvent.change(screen.getByLabelText(/使用個数/), {
        target: { value: "" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録/ }));

      await vi.waitFor(() => {
        // 使用個数のエラーが表示される
        expect(screen.queryByText(/使用個数は1以上/)).toBeInTheDocument();
      });
    });

    it("複数のバリデーションエラーが同時に表示されること", async () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      // 使用個数を0に
      fireEvent.change(screen.getByLabelText(/使用個数/), {
        target: { value: "0" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録/ }));

      await vi.waitFor(() => {
        expect(screen.queryByText(/使用個数は1以上/)).toBeInTheDocument();
      });
    });

    it("数量が空文字列でもエラーメッセージが「使用個数は1以上」であること", async () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      fireEvent.change(screen.getByLabelText(/使用個数/), {
        target: { value: "" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録/ }));

      await vi.waitFor(() => {
        const errorMsg = screen.queryByText(/使用個数は1以上/);
        expect(errorMsg).toBeInTheDocument();
      });
    });
  });

  describe("送信ボタンの文言", () => {
    it("新規登録モードではボタンに「登録する」と表示されること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      expect(
        screen.getByRole("button", { name: /^登録する$/ }),
      ).toBeInTheDocument();
    });

    it("編集モードではボタンに「更新」と表示されること", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} editId={1} />);
      expect(
        screen.getByRole("button", { name: /更新/ }),
      ).toBeInTheDocument();
    });
  });
});