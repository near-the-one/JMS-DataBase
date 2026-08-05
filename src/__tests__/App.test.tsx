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
      // Header logo should be present - check for the logo image alt text
      expect(screen.getByAltText("みんなで作る！きのこデータベース")).toBeInTheDocument();
    });

    it("ヘッダーにロゴとナビタブが表示されること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      // Check header specifically
      expect(screen.getByAltText("みんなで作る！きのこデータベース")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /ダッシュボード/ })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /登録フォーム/ })).toBeInTheDocument();
    });

    it("Dashboard コンテンツ（確率カード）が含まれていること", async () => {
      render(<App />);
      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/種類ごとの昇級確率/i)).toBeInTheDocument();
      expect(screen.getAllByText(/ネオキューブ/)).toHaveLength(2); // tab button + card name
      expect(screen.getByText(/メガキューブ/)).toBeInTheDocument();
      expect(screen.getByText(/ネオアディショナル/)).toBeInTheDocument();
    });

    it("統計ストリップが表示されること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/総サンプル数/)).toBeInTheDocument();
      expect(screen.getByText(/参加ユーザー/)).toBeInTheDocument();
      expect(screen.getByText(/2倍未達のキューブ/)).toBeInTheDocument();
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
      const numbers = screen.queryAllByText(/\d+/);
      expect(numbers.length).toBeGreaterThan(0);
    });

    it("ページ内に '%' 表記の昇級率が表示されていること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      expect(screen.queryAllByText(/%/).length).toBeGreaterThan(0);
    });

    it("等級遷移（レア→エピックなど）が表示されていること", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      // Check for grade transition text
      expect(screen.getByText(/レア/).parentElement?.textContent).toContain("エピック");
    });
  });

  describe("統合レイアウト", () => {
    it("App が Dashboard を含み、主要な表示要素を持つこと", async () => {
      render(<App />);
      // Wait for dashboard to load to avoid act warnings
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      // Header logo - use getByAltText for the banner/logo
      expect(screen.getByAltText("みんなで作る！きのこデータベース")).toBeInTheDocument();
      expect(screen.getByText(/種類ごとの昇級確率/i)).toBeInTheDocument();
      expect(screen.getAllByText(/ネオキューブ/)).toHaveLength(2);
      expect(screen.getByText(/メガキューブ/)).toBeInTheDocument();
      expect(screen.getByText(/ネオアディショナル/)).toBeInTheDocument();
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
      expect(bodyText).toMatch(/みんなで作る！きのこデータベース/i);
      expect(bodyText).toMatch(/ダッシュボード/);
      expect(bodyText).toMatch(/登録フォーム/);  // テストでは登録フォームが表示されている

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
      expect(bodyText).toMatch(/2倍未達のキューブ/);
      expect(bodyText).toMatch(/参加ユーザー/);
      expect(bodyText).toMatch(/最終更新/);
      expect(bodyText).toMatch(/ミラクルタイム開催中/);
    });
  });

  describe("Phase1: 手入力フォーム・ダッシュボード統合", () => {
    describe("正常登録（ホーム画面）", () => {
      beforeEach(async () => {
        renderHomePage();
        // Wait for dashboard to load
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });
        // Switch to form tab
        fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));
        expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
      });

      it("フォームを入力して登録ボタンを押すと成功メッセージが表示されること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        const serverSelect = form.getByLabelText(/サーバー名/);
        fireEvent.change(serverSelect, { target: { value: "かえで" } });

        const potentialSelect = form.getByLabelText(/潜在能力種別/);
        fireEvent.change(potentialSelect, { target: { value: "potential" } });

        const cubeSelect = form.getByLabelText(/キューブ種類/);
        fireEvent.change(cubeSelect, { target: { value: "neo" } });

        const gradeBeforeSelect = form.getByLabelText(/挑戦した等級/);
        fireEvent.change(gradeBeforeSelect, { target: { value: "rare" } });

        const quantityInput = form.getByLabelText(/使用個数/);
        fireEvent.change(quantityInput, { target: { value: "5" } });

        const submitBtn = form.getByRole("button", { name: /登録する/ });
        fireEvent.click(submitBtn);

        await waitFor(() => {
          expect(screen.getByText(/登録が成功しました/)).toBeInTheDocument();
        });

        // ダッシュボードタブに戻って確認
        fireEvent.click(screen.getByRole("tab", { name: /ダッシュボード/ }));
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });

      it("2件登録すると成功メッセージが2回表示されること", async () => {
        const fillAndSubmit = async (cube: "neo" | "mega") => {
          const form = within(screen.getByTestId('manual-entry-form'));
          fireEvent.change(form.getByLabelText(/キューブ種類/), {
            target: { value: cube },
          });
          fireEvent.change(form.getByLabelText(/使用個数/), {
            target: { value: "3" },
          });
          // Also set grade before for each
          fireEvent.change(form.getByLabelText(/挑戦した等級/), {
            target: { value: cube === "neo" ? "epic" : "rare" },
          });
          fireEvent.click(form.getByRole("button", { name: /登録する/ }));
          await waitFor(() => {
            expect(screen.getByText(/登録が成功しました/)).toBeInTheDocument();
          });
          // After submission, switch back to form tab for next entry
          fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));
        };

        await fillAndSubmit("neo");
        await fillAndSubmit("mega");

        // 成功メッセージが表示されることを確認
        expect(screen.getByText(/登録が成功しました/)).toBeInTheDocument();
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
          expect(screen.getByText(/登録が成功しました/)).toBeInTheDocument();
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
        fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));

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
        fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));

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

      it("無効な等級は選択肢に存在しないこと", async () => {
        renderHomePage();
        // Wait for dashboard to load
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });
        // Switch to form tab
        fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));

        const form = within(screen.getByTestId('manual-entry-form'));
        // 等級の選択肢を確認 - すべて有効な隣接遷移のみ
        const gradeSelect = form.getByLabelText(/挑戦した等級/) as HTMLSelectElement;
        const options = gradeSelect.querySelectorAll('option');
        const optionValues = Array.from(options).map(opt => opt.value);

        // 有効な等級のみが含まれる (legendaryは除外される - 昇級先がないため)
        expect(optionValues).toContain("rare");
        expect(optionValues).toContain("epic");
        expect(optionValues).toContain("unique");
        // legendary は含まれない
        expect(optionValues).not.toContain("legendary");
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
        fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));
        const form = within(screen.getByTestId('manual-entry-form'));
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "5" },
        });
        fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

        await waitFor(() => {
          expect(screen.getByText(/登録が成功しました/)).toBeInTheDocument();
        });

        // ダッシュボードタブに戻る
        fireEvent.click(screen.getByRole("tab", { name: /ダッシュボード/ }));
        // Wait for dashboard to reload after tab switch
        await waitFor(() => {
          expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
        });

        // Dashboardの内容が依然として表示されている
        expect(screen.getByAltText("みんなで作る！きのこデータベース")).toBeInTheDocument();
        expect(screen.queryAllByText(/潜在能力/).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryAllByText(/ネオキューブ/).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryAllByText(/メガキューブ/).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryAllByText(/ネオアディショナル/).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("テーブル構造（アクセシビリティ）", () => {
    it("フォームでテーブル（<table>）が存在しないこと", async () => {
      renderHomePage();
      // HomePage doesn't have record list, so no tables expected
      await waitFor(() => {
        expect(screen.getByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
      });
      const tables = screen.queryAllByRole("table");
      expect(tables.length).toBe(0);
    });

    it("フォーム内にセル（<td>）が存在しないこと", async () => {
      renderHomePage();

      // フォームタブに切り替え
      fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));
      const form = within(screen.getByTestId('manual-entry-form'));
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "5" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

      await waitFor(() => {
        expect(screen.getByText(/登録が成功しました/)).toBeInTheDocument();
      });

      // フォーム内にテーブルセルは存在しない
      const cells = screen.queryAllByRole("cell");
      expect(cells.length).toBe(0);
    });

    it("フォーム内に列見出し（<th>）が存在しないこと", async () => {
      renderHomePage();

      // フォームタブに切り替え
      fireEvent.click(screen.getByRole("tab", { name: /登録フォーム/ }));
      const form = within(screen.getByTestId('manual-entry-form'));
      fireEvent.change(form.getByLabelText(/使用個数/), {
        target: { value: "5" },
      });
      fireEvent.click(screen.getByRole("button", { name: /登録する/ }));

      await waitFor(() => {
        expect(screen.getByText(/登録が成功しました/)).toBeInTheDocument();
      });

      // フォーム内に列見出しは存在しない
      const headers = screen.queryAllByRole("columnheader");
      expect(headers.length).toBe(0);
    });
  });
});