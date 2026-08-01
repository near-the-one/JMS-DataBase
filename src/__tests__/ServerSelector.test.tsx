import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServerSelector } from "@/components/ServerSelector";
import { SERVER_NAMES } from "@/types";

describe("ServerSelector", () => {
  it("プルダウン要素（<select>）が表示されること", () => {
    render(<ServerSelector />);
    const select = screen.queryByRole("combobox");
    expect(select).toBeInTheDocument();
  });

  it("選択肢が5つ表示されること（全鯖 + 4サーバー）", () => {
    render(<ServerSelector />);
    const options = screen.queryAllByRole("option");
    expect(options.length).toBe(SERVER_NAMES.length + 1); // "全鯖" が追加
  });

  it.each(SERVER_NAMES)(
    "サーバー '%s' が選択肢に含まれていること",
    (server) => {
      render(<ServerSelector />);
      expect(screen.queryByText(server)).toBeInTheDocument();
    },
  );

  it("'全鯖' がデフォルト選択されていること", () => {
    render(<ServerSelector />);
    const select = screen.queryByRole("combobox") as HTMLSelectElement;
    if (select) {
      expect(select.value).toBe("all");
    }
  });

  it("label 要素が関連付けられていること", () => {
    render(<ServerSelector />);
    const select = screen.queryByRole("combobox") as HTMLSelectElement;
    if (select) {
      const label = screen.queryByLabelText(/サーバー|server/i);
      expect(label || select.labels?.length).toBeTruthy();
    }
  });

  describe("サーバー選択変更", () => {
    it("サーバーを 'ゆかり' に変更できること", async () => {
      const onChange = vi.fn();
      render(<ServerSelector onChange={onChange} />);
      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "ゆかり");
      expect(onChange).toHaveBeenCalledWith("ゆかり");
    });

    it("サーバーを 'くるみ' に変更できること", async () => {
      const onChange = vi.fn();
      render(<ServerSelector onChange={onChange} />);
      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "くるみ");
      expect(onChange).toHaveBeenCalledWith("くるみ");
    });

    it("サーバーを 'チャレンジャーズ' に変更できること", async () => {
      const onChange = vi.fn();
      render(<ServerSelector onChange={onChange} />);
      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "チャレンジャーズ");
      expect(onChange).toHaveBeenCalledWith("チャレンジャーズ");
    });
  });
});