/**
 * Phase 1: HomePage の構成テスト
 *
 * ゴール条件:
 * - HomePage はタブ切り替えで Dashboard / 登録一覧 / データ登録 を切り替える
 * - 初期状態ではダッシュボードが表示される
 * - 一般ユーザーは集計結果を閲覧でき、データ登録もできるが、個別レコードの一覧・編集・削除は「登録一覧」タブで行う
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "@/components/App";

describe("Phase1: HomePage 構成検証", () => {
  describe("レイアウト検証（ルーター経由 / パス）", () => {
    it("/ にアクセスするとダッシュボードが表示されること（初期状態）", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      // 初期状態はダッシュボード
      expect(screen.queryByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      // Check for dashboard-specific "ネオキューブ" in prob-card name (within the cube card)
      expect(screen.getByText(/種類ごとの昇級確率/i)).toBeInTheDocument();
      expect(screen.getAllByText(/ネオキューブ/)).toHaveLength(2); // tab button + card name
    });

    it("/ にアクセスしても RecordList は初期状態で表示されないこと", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      // RecordList の testid は HomePage には存在しない
      expect(screen.queryByTestId("record-list")).not.toBeInTheDocument();
    });

    it("ヘッダーにロゴとナビタブが表示されること", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      // Check specifically in header for logo
      const logoImg = screen.getByAltText("みんなで作る！きのこデータベース");
      expect(logoImg).toBeInTheDocument();
      const header = screen.getByRole("banner");
      expect(header).toHaveTextContent(/ダッシュボード/);
      expect(header).toHaveTextContent(/登録フォーム/);
      // Note: HomePage doesn't have "登録一覧" or "ログイン" tabs in the header
    });

    it("/ にアクセスしても ManualEntryForm は初期状態で表示されないこと", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      // 初期状態ではフォームは非表示（ダッシュボードが表示）
      // The form element is not rendered when not on the register tab
      expect(screen.queryByTestId("manual-entry-form")).not.toBeInTheDocument();
    });

    it("データ登録タブをクリックするとフォームが表示されること", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));
      expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
      expect(screen.queryByText(/SUBMIT DATA/i)).toBeInTheDocument();
      expect(screen.queryByText(/キューブ使用データ登録/)).toBeInTheDocument();
    });

    it("ダッシュボードタブをクリックするとダッシュボードに戻ること", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      // まずフォームタブをクリック
      fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));
      expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();

      // ダッシュボードタブをクリック
      fireEvent.click(screen.getByRole("tab", { name: /ダッシュボード/ }));
      expect(screen.queryByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
    });
  });

  describe("Router なし（Legacy モード）", () => {
    it("レガシーモード（Router なし）でもダッシュボードが初期表示されること", () => {
      render(<App />);
      expect(screen.queryByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      expect(screen.getByText(/種類ごとの昇級確率/i)).toBeInTheDocument();
    });

    it("レガシーモードでも RecordList は初期状態で表示されないこと", () => {
      render(<App />);
      expect(screen.queryByTestId("record-list")).not.toBeInTheDocument();
    });

    it("レガシーモードでデータ登録タブをクリックするとフォームが表示されること", () => {
      render(<App />);
      fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));
      expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
      // Also check within form container
      expect(screen.queryByText(/SUBMIT DATA/i)).toBeInTheDocument();
    });
  });

  describe("手入力後のダッシュボード表示確認", () => {
    it("/ で手入力後、ダッシュボードタブに戻るとダッシュボードが表示されること", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      // データ登録タブに移動
      fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));
      const form = within(screen.getByTestId("manual-entry-form"));
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "5" },
      });
      fireEvent.click(form.getByRole("button", { name: /登録する/ }));

      // 成功メッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/登録が成功しました/)).toBeInTheDocument();
      });

      // ダッシュボードタブに戻る
      fireEvent.click(screen.getByRole("tab", { name: /ダッシュボード/ }));
      expect(screen.queryByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
    });
  });
});