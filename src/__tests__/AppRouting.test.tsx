import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * App のルーティングテスト。
 *
 * ゴール条件（Phase 1）:
 * - "/" でダッシュボード + 手入力フォーム のみが表示される（RecordListは表示されない）
 * - "/admin" で管理者ログイン画面が表示される（未ログイン時）
 * - トップページからのリンクは無しで /admin はURL直打ちのみ
 * - ログイン後は管理者用一覧画面が表示される
 */

import { MemoryRouter } from "react-router-dom";
import { App } from "@/components/App";

describe("Phase1: ルーティング統合", () => {
  describe("トップページ (/)", () => {
    it("/ にアクセスするとダッシュボードが表示されること", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByText(/Maple CUBE/i)).toBeInTheDocument();
    });

    it("/ にアクセスすると手入力フォームが表示されること", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
    });

    it("/ にアクセスしても登録一覧（RecordList）は表示されないこと", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.queryByTestId("record-list")).not.toBeInTheDocument();
    });
  });

  describe("管理者ページ (/admin)", () => {
    it("/admin にアクセスするとログインフォームが表示されること", () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByTestId("admin-login-form")).toBeInTheDocument();
    });

    it("/admin は手入力フォームを表示しないこと", () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      expect(
        screen.queryByTestId("manual-entry-form"),
      ).not.toBeInTheDocument();
    });

    it("/admin でログイン成功後は一覧表示に切り替わること", async () => {
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
        expect(
          screen.queryByTestId("admin-login-form"),
        ).not.toBeInTheDocument();
        expect(screen.getByTestId("record-list")).toBeInTheDocument();
      });
    });

    it("/admin でログイン失敗するとログインフォームのままであること", async () => {
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
        expect(screen.getByTestId("admin-login-form")).toBeInTheDocument();
        // エラーメッセージ
        expect(
          screen.getByText(/ID またはパスワードが違います/),
        ).toBeInTheDocument();
      });
    });

    it("未ログイン状態では /admin で一覧が表示されないこと", () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );
      // ログインフォームは表示されているが一覧は表示されない
      expect(screen.getByTestId("admin-login-form")).toBeInTheDocument();
      expect(screen.queryByText(/管理者画面/)).not.toBeInTheDocument();
    });
  });

  describe("Phase1: /admin 経由の登録・編集・削除フロー（管理画面からの操作）", () => {
    it("/admin でログイン後、RecordListで登録→編集→更新が動作すること", async () => {
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>,
      );

      // ログイン
      fireEvent.change(screen.getByLabelText("ID"), {
        target: { value: "admin" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "admin" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));

      await waitFor(() => {
        expect(screen.queryByTestId("admin-login-form")).not.toBeInTheDocument();
      });

      // 管理画面内でManualEntryFormを操作（新しいレコードを登録）
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
  });
});