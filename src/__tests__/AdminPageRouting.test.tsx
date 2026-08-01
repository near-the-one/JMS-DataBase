/**
 * Phase 1: 管理画面の統合テスト
 *
 * ゴール条件:
 * - 管理画面（/admin）は現状維持。AdminLogin → AdminPage → RecordList の流れは変更しない。
 * - 認証はハードコード文字列（admin/admin）のまま。
 *
 * このテストでは /admin ルート経由での操作が、AdminPage テストと同様に成功することを検証する。
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "@/components/App";

describe("Phase1: AdminPage ルーティング統合", () => {
  describe("管理者ログイン", () => {
    it("/admin でログインフォームが表示されること", () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByTestId("admin-login-form")).toBeInTheDocument();
    });

    it("/admin でログイン成功後、管理者画面が表示されること", async () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText("ID"), {
        target: { value: "admin" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "admin" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));

      await waitFor(() => {
        expect(screen.queryByText(/管理者画面/)).toBeInTheDocument();
      });
    });

    it("ログイン失敗時はエラーメッセージが表示されること", async () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText("ID"), {
        target: { value: "wrong" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "wrong" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));

      await waitFor(() => {
        expect(
          screen.getByText(/ID またはパスワードが違います/),
        ).toBeInTheDocument();
      });
    });
  });

  describe("管理画面内の CRUD", () => {
    async function loginAsAdmin() {
      fireEvent.change(screen.getByLabelText("ID"), {
        target: { value: "admin" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "admin" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));
      await waitFor(() => {
        expect(screen.queryByText(/管理者画面/)).toBeInTheDocument();
      });
    }

    it("ログイン後、RecordList が表示されること", async () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      await loginAsAdmin();
      expect(screen.getByTestId("record-list")).toBeInTheDocument();
    });

    it("ログイン後 ManualEntryForm が表示されること", async () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      await loginAsAdmin();
      expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
    });

    it("管理画面で手入力登録すると一覧に追加されること", async () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      await loginAsAdmin();

      const form = within(screen.getByTestId("manual-entry-form"));
      fireEvent.change(form.getByLabelText(/サーバー/), {
        target: { value: "かえで" },
      });
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "5" },
      });
      fireEvent.click(form.getByRole("button", { name: /登録/ }));

      await waitFor(() => {
        expect(screen.queryByText(/データがありません/)).not.toBeInTheDocument();
      });

      const rows = screen.queryAllByTestId(/record-row-/);
      expect(rows.length).toBe(1);
    });

    it("管理画面で RecordList の編集ボタンが動作すること", async () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      await loginAsAdmin();

      // まず登録
      const form = within(screen.getByTestId("manual-entry-form"));
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "3" },
      });
      fireEvent.click(form.getByRole("button", { name: /登録/ }));

      await waitFor(() => {
        expect(screen.queryByText(/データがありません/)).not.toBeInTheDocument();
      });

      // 編集ボタンをクリック
      fireEvent.click(screen.getByText("編集"));

      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /更新/ }),
        ).toBeInTheDocument();
      });
    });

    it("管理画面で RecordList の削除ボタンが動作すること", async () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      await loginAsAdmin();

      // まず登録
      const form = within(screen.getByTestId("manual-entry-form"));
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "1" },
      });
      fireEvent.click(form.getByRole("button", { name: /登録/ }));

      await waitFor(() => {
        expect(screen.queryByText(/データがありません/)).not.toBeInTheDocument();
      });

      // 削除ボタンを押す
      fireEvent.click(screen.getByText("削除"));

      await waitFor(() => {
        expect(screen.queryByText(/データがありません/)).toBeInTheDocument();
      });
    });
  });

  describe("管理画面でのフィルード (part, used_at)", () => {
    async function loginAsAdmin() {
      fireEvent.change(screen.getByLabelText("ID"), {
        target: { value: "admin" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "admin" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));
      await waitFor(() => {
        expect(screen.queryByText(/管理者画面/)).toBeInTheDocument();
      });
    }

    it("管理画面の ManualEntryForm に部位選択が表示されること", async () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      await loginAsAdmin();
      expect(screen.queryByLabelText(/部位/)).toBeInTheDocument();
    });

    it("管理画面の ManualEntryForm に使用日時入力が表示されること", async () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      await loginAsAdmin();
      expect(screen.queryByLabelText(/使用日時/)).toBeInTheDocument();
    });
  });
});