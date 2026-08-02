import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * App のルーティングテスト。
 *
 * ゴール条件（Phase 1）:
 * - "/" でダッシュボード + 手入力フォーム + 登録一覧 がタブ切り替えで表示される
 */

import { MemoryRouter } from "react-router-dom";
import { App } from "@/components/App";

// Mock the supabase client for routing tests
vi.mock("@/infrastructure/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockImplementation(async (credentials) => {
        if (credentials.email === "test@example.com" && credentials.password === "password123") {
          const session = { user: { email: "test@example.com" }, access_token: "mock-token" };
          return { error: null, data: { session } };
        }
        return { error: { message: "Invalid credentials" } };
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockImplementation((callback) => {
        callback(null, null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe("Phase1: ルーティング統合", () => {
  describe("トップページ (/)", () => {
    it("/ にアクセスするとダッシュボードが表示されること（初期状態）", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      // Use getByRole for banner and getByText for dashboard title
      expect(screen.getByRole("banner")).toHaveTextContent(/JMS DataBase/i);
      expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
    });

    it("/ にアクセスしても ManualEntryForm は初期状態で表示されないこと", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      // 初期状態ではフォームは非表示（ダッシュボードが表示）
      expect(screen.queryByTestId("manual-entry-form")).not.toBeInTheDocument();
    });

    it("/ にアクセスしても RecordList は初期状態で表示されないこと", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.queryByTestId("record-list")).not.toBeInTheDocument();
    });

    it("データ登録タブをクリックするとフォームが表示されること", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));
      expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
    });

    it("登録一覧タブをクリックすると一覧が表示されること", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
      // When no data, shows "データがありません" text
      expect(screen.getByText(/データがありません/)).toBeInTheDocument();
    });
  });
});