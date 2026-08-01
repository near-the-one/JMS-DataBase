// capture-app/src/__tests__/App.supabase.test.tsx
/**
 * Phase2: App コンポーネントが Supabase ベースの Repository を使うように
 * 変更されたことをテストします。
 *
 * このファイルはすべて RED（未実装のため失敗する）です。
 * 実装が完了した時点でグリーンになることを期待します。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "@/components/App";

describe("Phase2: App + Supabase 統合", () => {
  describe("一覧取得", () => {
    it("/ でデータ取得中はローディング表示がされる", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      // Phase2 では getAllAsync が完了するまでローディング状態が表示されることを期待。
      // 実装前はこの要素はまだ存在せず失敗する。
      const loading = screen.getByText("読み込み中...");
      expect(loading).toBeTruthy();
    });

    it("/ でデータ取得エラー時はエラーメッセージが表示される", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      // 通信エラーが発生するとエラーメッセージが表示されることを期待。
      const errorMsg = screen.getByText(/データの読み込みに失敗しました/);
      expect(errorMsg).toBeTruthy();
    });
  });

  describe("保存", () => {
    it("保存中はローディング表示がされる", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      const form = within(screen.getByTestId("manual-entry-form"));
      fireEvent.click(form.getByRole("button", { name: /登録/ }));

      const saving = screen.getByText("保存中...");
      expect(saving).toBeTruthy();
    });

    it("保存失敗時にエラーメッセージが表示される", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      const form = within(screen.getByTestId("manual-entry-form"));
      fireEvent.click(form.getByRole("button", { name: /登録/ }));

      // 保存が失敗した場合のエラー表示
      const errorMsg = screen.getByText(/保存に失敗しました/);
      expect(errorMsg).toBeTruthy();
    });
  });

  describe("更新と削除", () => {
    it("更新失敗時にエラーメッセージが表示される", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      // 編集ボタンをクリックすると、更新が失敗した場合にエラーが表示される
      // 実装によりこの要素が現れる
      const errorMsg = screen.getByText(/更新に失敗しました/);
      expect(errorMsg).toBeTruthy();
    });

    it("削除失敗時にエラーメッセージが表示される", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      // 削除が失敗した場合のエラー表示
      const errorMsg = screen.getByText(/削除に失敗しました/);
      expect(errorMsg).toBeTruthy();
    });
  });

  describe("通信エラー全般", () => {
    it("ネットワークエラー時にリトライボタンが表示される", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      const retryButton = screen.getByRole("button", { name: /再試行/ });
      expect(retryButton).toBeTruthy();
    });
  });
});