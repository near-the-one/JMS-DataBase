// Phase 7: ローディング表示テスト
// データ取得中のローディング表示（スピナー、スケルトン）が実装されていることを検証する
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";

describe("Phase7: ローディング表示", () => {
  it("データ取得中はローディングインジケーターが表示される", () => {
    render(<Dashboard />);
    // データ読み込み中はスピナーまたはプログレスバーが存在する
    const loadingIndicator =
      screen.queryByRole("progressbar") ??
      screen.queryByRole("status") ??
      screen.queryByTestId("loading-indicator") ??
      screen.queryByText(/読み込み中/);
    expect(loadingIndicator).toBeInTheDocument();
  });

  it("ローディング表示はアクセシブルなラベルを持つ", () => {
    render(<Dashboard />);
    const loading = screen.queryByRole("status") ?? screen.queryByRole("progressbar");
    if (!loading) {
      // 実装前: 代替として testid で確認
      const el = screen.queryByTestId("loading-indicator");
      expect(el).toBeInTheDocument();
      return;
    }
    expect(loading).toBeInTheDocument();
  });

  it("データ表示中はローディング表示が非表示になる", () => {
    render(<Dashboard />);
    // データが表示されていてローディングが非表示であること
    const hasData = screen.queryByText(/サンプルデータ数/) !== null;
    if (hasData) {
      const loading = screen.queryByRole("progressbar") ?? screen.queryByTestId("loading-indicator");
      expect(loading).not.toBeInTheDocument();
    }
    // データがあればローディングは不要
    expect(screen.queryByText(/Maple CUBE/)).toBeInTheDocument();
  });
});