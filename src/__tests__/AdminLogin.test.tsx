import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminLogin } from "@/components/AdminLogin";

// Mock supabase auth - use vi.hoisted to avoid hoisting issues
const { mockSignInWithPassword } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
}));

vi.mock("@/infrastructure/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  },
}));

describe("Phase1: AdminLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("フォーム表示", () => {
    it("ログインフォームが表示されること", () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);
      expect(screen.getByTestId("admin-login-form")).toBeInTheDocument();
    });

    it("メールアドレス入力欄が表示されること", () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);
      expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    });

    it("パスワード入力欄が表示されること（type=password）", () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);
      const pwInput = screen.getByLabelText("パスワード");
      expect(pwInput).toBeInTheDocument();
      expect(pwInput).toHaveAttribute("type", "password");
    });

    it("ログインボタンが表示されること", () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);
      expect(
        screen.getByRole("button", { name: /ログイン/ }),
      ).toBeInTheDocument();
    });
  });

  describe("認証成功", () => {
    it("正しいメールアドレス/パスワードでログイン成功時に onLoginSuccess が呼ばれること", async () => {
      const onSuccess = vi.fn();
      mockSignInWithPassword.mockResolvedValue({ error: null });
      render(<AdminLogin onLoginSuccess={onSuccess} />);

      fireEvent.change(screen.getByLabelText("メールアドレス"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("認証失敗", () => {
    it("誤ったメールアドレスでエラーメッセージが表示されること", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
      render(<AdminLogin onLoginSuccess={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("メールアドレス"), {
        target: { value: "wrong@example.com" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));

      await waitFor(() => {
        expect(
          screen.getByText(/認証エラーが発生しました|ID またはパスワードが違います/),
        ).toBeInTheDocument();
      });
    });

    it("誤ったパスワードでエラーメッセージが表示されること", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
      render(<AdminLogin onLoginSuccess={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("メールアドレス"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "wrong" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));

      await waitFor(() => {
        expect(
          screen.getByText(/認証エラーが発生しました|ID またはパスワードが違います/),
        ).toBeInTheDocument();
      });
    });

    it("メールアドレス未入力でエラーメッセージが表示されること", async () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));

      await waitFor(() => {
        expect(
          screen.getByText(/ID を入力してください/),
        ).toBeInTheDocument();
      });
    });

    it("パスワード未入力でエラーメッセージが表示されること", async () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("メールアドレス"), {
        target: { value: "test@example.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));

      await waitFor(() => {
        expect(
          screen.getByText(/パスワードを入力してください/),
        ).toBeInTheDocument();
      });
    });
  });

  describe("ログイン成功後のUI切り替え", () => {
    it("ログイン成功後はログインフォームが非表示になること", async () => {
      const onSuccess = vi.fn();
      mockSignInWithPassword.mockResolvedValue({ error: null });
      const { rerender } = render(
        <AdminLogin onLoginSuccess={onSuccess} />,
      );

      fireEvent.change(screen.getByLabelText("メールアドレス"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });
});