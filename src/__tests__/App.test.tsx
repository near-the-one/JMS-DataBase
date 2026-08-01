import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "@/components/App";

/** Mock the supabase client for routing tests */
const { mockSignInWithPassword, mockGetSession, mockSignOut, mockOnAuthStateChange } = vi.hoisted(() => {
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  return {
    mockSignInWithPassword: vi.fn().mockImplementation(async (credentials) => {
      // If credentials are correct, return success and trigger auth state change
      if (credentials.email === "test@example.com" && credentials.password === "password123") {
        const session = { user: { email: "test@example.com" }, access_token: "mock-token" };
        if (authStateCallback) {
          // Call the callback asynchronously to simulate the real behavior
          setTimeout(() => authStateCallback('SIGNED_IN', session), 0);
        }
        return { error: null, data: { session } };
      }
      return { error: { message: "Invalid credentials" } };
    }),
    mockGetSession: vi.fn().mockImplementation(async () => {
      // Return null session initially (not logged in)
      return { data: { session: null } };
    }),
    mockSignOut: vi.fn().mockImplementation(async () => {
      if (authStateCallback) {
        setTimeout(() => authStateCallback('SIGNED_OUT', null), 0);
      }
      return { error: null };
    }),
    mockOnAuthStateChange: vi.fn().mockImplementation((callback) => {
      authStateCallback = callback;
      // Initially call with no session - synchronously to match real behavior
      callback(null, null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };
});

vi.mock("@/infrastructure/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
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

/** Render App at /home (default) */
function renderHomePage() {
  cleanup(); // Phase1: cleanup previous render to avoid duplicate manual-entry-form
  render(<App />);
}

describe("App", () => {
  describe("ページ基本構造", () => {
    it("トップページがレンダリングされること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      // Header logo should be present
      const header = screen.getByRole("banner");
      expect(header).toHaveTextContent(/Maple CUBE/i);
    });

    it("ヘッダーにロゴとナビタブが表示されること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      // Check header specifically
      const header = screen.getByRole("banner");
      expect(header).toHaveTextContent(/Maple CUBE/i);
      expect(header).toHaveTextContent(/ダッシュボード/);
      expect(header).toHaveTextContent(/登録一覧/);
      expect(header).toHaveTextContent(/データ登録/);
    });

    it("Dashboard コンテンツ（確率カード）が含まれていること", async () => {
      render(<App />);
      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      const dashboardView = screen.getByTestId("view-dashboard");
      expect(within(dashboardView).getByText(/ネオキューブ/)).toBeInTheDocument();
      expect(within(dashboardView).getByText(/メガキューブ/)).toBeInTheDocument();
      expect(within(dashboardView).getByText(/ネオアディショナル/)).toBeInTheDocument();
    });

    it("統計ストリップが表示されること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/総サンプル数/)).toBeInTheDocument();
      expect(screen.getByText(/対応キューブ種/)).toBeInTheDocument();
      expect(screen.getByText(/総使用個数/)).toBeInTheDocument();
      expect(screen.getByText(/最終更新/)).toBeInTheDocument();
    });

    it("ミラクルタイムバナーが表示されること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/ミラクルタイム開催中/)).toBeInTheDocument();
    });
  });

  describe("表示データ", () => {
    it("ページ内に使用個数の数字が表示されていること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      const dashboardView = screen.getByTestId("view-dashboard");
      const numbers = within(dashboardView).queryAllByText(/\d+/);
      expect(numbers.length).toBeGreaterThan(0);
    });

    it("ページ内に '%' 表記の昇級率が表示されていること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      const dashboardView = screen.getByTestId("view-dashboard");
      expect(within(dashboardView).queryAllByText(/%/).length).toBeGreaterThan(0);
    });

    it("等級遷移（レア→エピックなど）が表示されていること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      const dashboardView = screen.getByTestId("view-dashboard");
      // Check that grade-flow elements exist with appropriate text
      const gradeFlows = within(dashboardView).getAllByTestId(/grade-flow/);
      expect(gradeFlows.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("統合レイアウト", () => {
    it("App が Dashboard を含み、主要な表示要素を持つこと", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      // Header logo - use getByRole for the banner/logo
      expect(screen.getByRole("banner")).toHaveTextContent(/Maple CUBE/i);
      const dashboardView = screen.getByTestId("view-dashboard");
      expect(within(dashboardView).getByText(/ネオキューブ/)).toBeInTheDocument();
      expect(within(dashboardView).getByText(/メガキューブ/)).toBeInTheDocument();
      expect(within(dashboardView).getByText(/ネオアディショナル/)).toBeInTheDocument();
      expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
    });

    it("すべての必要な表示要素がタブ切り替えで共存していること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      const bodyText = document.body.textContent ?? "";

      // Header elements (always visible)
      expect(bodyText).toMatch(/Maple CUBE/i);
      expect(bodyText).toMatch(/ダッシュボード/);
      expect(bodyText).toMatch(/登録一覧/);
      expect(bodyText).toMatch(/データ登録/);

      // Dashboard elements (visible when dashboard tab active)
      expect(bodyText).toMatch(/PROBABILITY OVERVIEW/i);
      expect(bodyText).toMatch(/ネオキューブ/);
      expect(bodyText).toMatch(/メガキューブ/);
      expect(bodyText).toMatch(/ネオアディショナル/);
      expect(bodyText).toMatch(/潜在能力/);
      expect(bodyText).toMatch(/アディショナル/);
      expect(bodyText).toMatch(/レア/);
      expect(bodyText).toMatch(/エピック/);
      expect(bodyText).toMatch(/ユニーク/);
      expect(bodyText).toMatch(/レジェンダリー/);
      expect(bodyText).toMatch(/総サンプル数/);
      expect(bodyText).toMatch(/対応キューブ種/);
      expect(bodyText).toMatch(/総使用個数/);
      expect(bodyText).toMatch(/最終更新/);
      expect(bodyText).toMatch(/ミラクルタイム開催中/);
    });
  });

  describe("Phase1: 手入力フォーム・一覧・ダッシュボード統合", () => {
    describe("正常登録（ホーム画面）", () => {
      beforeEach(async () => {
        renderHomePage();
        // Wait for dashboard to load
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });
        // Switch to form tab
        fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));
        const formView = screen.getByTestId("view-form");
        expect(formView).not.toHaveAttribute("hidden");
      });

      it("フォームを入力して登録ボタンを押すと一覧に反映されること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        const serverSelect = form.getByLabelText(/サーバー名/);
        fireEvent.change(serverSelect, { target: { value: "かえで" } });

        const potentialSelect = form.getByLabelText(/潜在能力種別/);
        fireEvent.change(potentialSelect, { target: { value: "potential" } });

        const cubeSelect = form.getByLabelText(/キューブ種類/);
        fireEvent.change(cubeSelect, { target: { value: "neo" } });

        const gradeTransitionSelect = form.getByLabelText(/等級遷移/);
        fireEvent.change(gradeTransitionSelect, { target: { value: "rare-epic" } });

        const quantityInput = form.getByLabelText(/使用個数/);
        fireEvent.change(quantityInput, { target: { value: "5" } });

        const submitBtn = form.getByRole("button", { name: /登録する/ });
        fireEvent.click(submitBtn);

        await waitFor(() => {
          expect(
            screen.queryByText(/データがありません/),
          ).not.toBeInTheDocument();
        });

        // 登録一覧タブに切り替えて確認
        fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
        const rows = screen.queryAllByTestId(/record-row-/);
        expect(rows.length).toBe(1);
      });

      it("2件登録すると一覧に2つ表示されること", async () => {
        const fillAndSubmit = async (cube: "neo" | "mega") => {
          const form = within(screen.getByTestId('manual-entry-form'));
          fireEvent.change(form.getByLabelText(/キューブ種類/), {
            target: { value: cube },
          });
          fireEvent.change(form.getByLabelText(/使用個数/), {
            target: { value: "3" },
          });
          // Also set grade transition for each
          fireEvent.change(form.getByLabelText(/等級遷移/), {
            target: { value: cube === "neo" ? "epic-unique" : "rare-epic" },
          });
          fireEvent.click(form.getByRole("button", { name: /登録する/ }));
          await waitFor(() => {
            expect(screen.queryByText(/データがありません/)).not.toBeInTheDocument();
          });
          // After submission, switch back to form tab for next entry
          fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));
        };

        await fillAndSubmit("neo");
        await fillAndSubmit("mega");

        fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
        const rows = screen.getAllByTestId(/record-row-/);
        expect(rows).toHaveLength(2);
      });

      it("character_nameを入力して登録すると一覧にキャラクター名が表示されること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        fireEvent.change(form.getByLabelText(/キャラクター名/), {
          target: { value: "さくら" },
        });
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "1" },
        });
        fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

        await waitFor(() => {
          fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
          expect(screen.queryByText(/さくら/)).toBeInTheDocument();
        });
      });
    });

    describe("編集", () => {
      it("一覧の編集ボタンを押すとフォームが編集モード（更新ボタン）になること", async () => {
        renderHomePage();
        // Wait for dashboard to load
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });
        // Switch to form tab
        fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));

        const form = within(screen.getByTestId('manual-entry-form'));
        // まず登録
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "5" },
        });
        fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

        await waitFor(() => {
          expect(screen.queryByText(/データがありません/)).not.toBeInTheDocument();
        });

        // 登録一覧に切り替え
        fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));

        // 編集ボタンを押す
        const editBtn = screen.getByText(/編集/);
        fireEvent.click(editBtn);

        // 更新ボタンが表示されている
        await waitFor(() => {
          expect(
            screen.queryByRole("button", { name: /更新/ }),
          ).toBeInTheDocument();
        });
      });

      it("編集モードで送信すると一覧が更新されること", async () => {
        renderHomePage();
        // Wait for dashboard to load
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });
        // Switch to form tab
        fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));

        const form = within(screen.getByTestId('manual-entry-form'));
        // まず登録
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "3" },
        });
        fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

        await waitFor(() => {
          fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
          const listEl = screen.getByTestId("record-list");
          expect(listEl.textContent).toContain("3");
        });

        // 編集
        const editBtns = screen.getAllByText(/^編集$/);
        fireEvent.click(editBtns[0]);

        await waitFor(() => {
          const formAfter = within(screen.getByTestId("manual-entry-form"));
          expect(
            formAfter.queryByRole("button", { name: /更新/ }),
          ).toBeInTheDocument();
        });

        // 使用個数を変更（編集モード後のフォームを再取得）
        const formAfter = within(screen.getByTestId("manual-entry-form"));
        const quantityInput = formAfter.getByLabelText(/使用個数/) as HTMLInputElement;
        fireEvent.change(quantityInput, { target: { value: "99" } });
        fireEvent.click(formAfter.getByRole("button", { name: /更新/ }));

        await waitFor(() => {
          fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
          const listEl = screen.getByTestId("record-list");
          expect(listEl.textContent).toContain("99");
        });
      });
    });

    describe("削除", () => {
      it("一覧の削除ボタンを押すとデータが消えること", async () => {
        renderHomePage();
        // Wait for dashboard to load
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });
        // Switch to form tab
        fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));

        const form = within(screen.getByTestId('manual-entry-form'));
        // まず登録
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "1" },
        });
        fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

        await waitFor(() => {
          fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
          expect(screen.queryByText(/データがありません/)).not.toBeInTheDocument();
        });

        // 削除ボタンを押す
        const deleteBtn = screen.getByText("削除");
        fireEvent.click(deleteBtn);

        await waitFor(() => {
          expect(screen.queryByText(/データがありません/)).toBeInTheDocument();
        });
      });
    });

    describe("入力エラー", () => {
      it("数量が空のまま登録するとエラーが表示されること", async () => {
        renderHomePage();
        // Wait for dashboard to load
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });
        // Switch to form tab
        fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));

        const form = within(screen.getByTestId('manual-entry-form'));
        // 数量を空にする（デフォルトは "1"）
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "" },
        });
        fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

        await waitFor(() => {
          // 数量エラーメッセージが表示される
          expect(
            form.queryByText(/使用個数は1以上/),
          ).toBeInTheDocument();
        });
      });

      it("使用個数が0で登録するとエラーが表示されること", async () => {
        renderHomePage();
        // Wait for dashboard to load
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });
        // Switch to form tab
        fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));

        const form = within(screen.getByTestId('manual-entry-form'));
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "0" },
        });
        fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

        await waitFor(() => {
          // 数量エラーメッセージが表示される
          expect(
            form.queryByText(/使用個数は1以上/),
          ).toBeInTheDocument();
        });
      });

      it("無効な等級遷移は選択肢に存在しないこと", async () => {
        renderHomePage();
        // Wait for dashboard to load
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });
        // Switch to form tab
        fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));

        const form = within(screen.getByTestId('manual-entry-form'));
        // 等級遷移の選択肢を確認 - すべて有効な隣接遷移のみ
        const gradeSelect = form.getByLabelText(/等級遷移/) as HTMLSelectElement;
        const options = gradeSelect.querySelectorAll('option');
        const optionValues = Array.from(options).map(opt => opt.value);

        // 有効な遷移のみが含まれる
        expect(optionValues).toContain("rare-epic");
        expect(optionValues).toContain("epic-unique");
        expect(optionValues).toContain("unique-legendary");
        // 無効な遷移は含まれない
        expect(optionValues).not.toContain("epic-rare");
        expect(optionValues).not.toContain("rare-rare");
        expect(optionValues).not.toContain("unique-epic");
      });
    });

    describe("ダッシュボードへの反映", () => {
      it("手入力登録後もDashboardの表示が継続されていること", async () => {
        renderHomePage();
        // Wait for dashboard to load
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });

        // フォームタブに切り替えてデータを登録
        fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));
        const form = within(screen.getByTestId('manual-entry-form'));
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "5" },
        });
        fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

        await waitFor(() => {
          expect(screen.queryByText(/データがありません/)).not.toBeInTheDocument();
        });

        // ダッシュボードタブに戻る
        fireEvent.click(screen.getByRole("tab", { name: /ダッシュボード/ }));
        // Wait for dashboard to reload after tab switch
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });

        // Dashboardの内容が依然として表示されている
        expect(screen.getByRole("banner")).toHaveTextContent(/Maple CUBE/i);
        expect(screen.queryAllByText(/潜在能力/).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryAllByText(/ネオキューブ/).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryAllByText(/メガキューブ/).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryAllByText(/ネオアディショナル/).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("テーブル構造（アクセシビリティ）", () => {
    it("登録一覧でテーブル（<table>）が存在すること", async () => {
      renderHomePage();
      fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
      // Initially no data, so no table. Add data first.
      fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));
      const form = within(screen.getByTestId('manual-entry-form'));
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "5" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

      await waitFor(() => {
        fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
        const tables = screen.queryAllByRole("table");
        expect(tables.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("テーブル内にセル（<td>）が存在し、数字データを含むこと", async () => {
      renderHomePage();

      // まずデータを登録
      fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));
      const form = within(screen.getByTestId('manual-entry-form'));
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "5" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

      await waitFor(() => {
        fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
        const cells = screen.queryAllByRole("cell");
        expect(cells.length).toBeGreaterThanOrEqual(4);
      });
    });

    it("テーブル内に列見出し（<th>）が存在すること", async () => {
      renderHomePage();
      // Add data first
      fireEvent.click(screen.getByRole("tab", { name: /データ登録/ }));
      const form = within(screen.getByTestId('manual-entry-form'));
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "5" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

      await waitFor(() => {
        fireEvent.click(screen.getByRole("tab", { name: /登録一覧/ }));
        const headers = screen.queryAllByRole("columnheader");
        expect(headers.length).toBeGreaterThanOrEqual(2);
      });
    });
  });
});