/**
 * Phase 1: HomePage の構成テスト
 *
 * ゴール条件:
 * - HomePage から RecordList の描画が削除されていること
 * - HomePage には Dashboard + ManualEntryForm のみが表示されること
 * - 一般ユーザーは集計結果を閲覧できるが、個別レコードの一覧・編集・削除はできない
 *
 * App.tsx 内の HomePage は showRecordList=false でルーティングされる想定。
 * ここでは HomePage の挙動を独立してテストする。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "@/components/App";

describe("Phase1: HomePage 構成検証", () => {
  describe("レイアウト検証（ルーター経由 / パス）", () => {
    it("/ にアクセスしても RecordList が表示されないこと", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      // RecordList の testid は存在しないはず
      expect(screen.queryByTestId("record-list")).not.toBeInTheDocument();
    });

    it("/ にアクセスすると Dashboard が表示されること", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.queryByText(/Maple CUBE/i)).toBeInTheDocument();
    });

    it("/ にアクセスすると ManualEntryForm が表示されること", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
    });

    it("/ にアクセスしても「登録一覧」見出しが表示されないこと", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.queryByText(/登録一覧/)).not.toBeInTheDocument();
    });

    it("/ にアクセスしても編集ボタン・削除ボタンが表示されないこと", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      // 編集/削除ボタンは RecordList 内にのみ存在→非表示なら存在しない
      const buttons = screen.queryAllByRole("button");
      const editDelete = screen.queryAllByText(/^(編集|削除)$/);
      expect(editDelete.length).toBe(0);
    });
  });

  describe("Router なし（Legacy モード）", () => {
    it("レガシーモード（Router なし）でも RecordList は表示されないこと", () => {
      render(<App />);
      expect(screen.queryByTestId("record-list")).not.toBeInTheDocument();
    });

    it("レガシーモードでも Dashboard が表示されること", () => {
      render(<App />);
      expect(screen.queryByText(/Maple CUBE/i)).toBeInTheDocument();
    });

    it("レガシーモードでも ManualEntryForm が表示されること", () => {
      render(<App />);
      expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
    });
  });

  describe("手入力後の RecordList 表示制御", () => {
    it("/ で手入力後も RecordList が表示されないこと", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      const form = within(screen.getByTestId("manual-entry-form"));
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "5" },
      });
      fireEvent.click(form.getByRole("button", { name: /登録/ }));

      // データが登録されても RecordList は現れない
      await waitFor(() => {
        // "データがありません"（ManualEntryForm 付近のもの）が消えることを待つ... ではなく
        // 重要なのは登録後も record-list が存在しないこと
        expect(screen.queryByTestId("record-list")).not.toBeInTheDocument();
      });
    });

    it("/ では一般ユーザーがデータを登録しても編集ボタンが現れないこと", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      const form = within(screen.getByTestId("manual-entry-form"));
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "3" },
      });
      fireEvent.click(form.getByRole("button", { name: /登録/ }));

      await waitFor(() => {
        // 登録処理は終わっている（フォームの submit ボタンが再表示される）
        expect(screen.getByRole("button", { name: /登録/ })).toBeInTheDocument();
      });

      // 編集/削除ボタンは存在しない
      expect(screen.queryByText("編集")).not.toBeInTheDocument();
      expect(screen.queryByText("削除")).not.toBeInTheDocument();
    });
  });
});