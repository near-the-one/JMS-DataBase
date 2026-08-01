// Phase6: エラー表示テスト（未実装）
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";

// Dashboard が内部でデータ取得エラーをハンドリングすると仮定
describe("Dashboard error handling", () => {
  it("データ取得エラー時にエラーメッセージが表示される", () => {
    // 現在はエラーハンドリングが無いので失敗が期待されます
    render(<Dashboard />);
    const errorMsg = screen.queryByText(/エラーが発生しました/i);
    expect(errorMsg).toBeInTheDocument();
  });
});
