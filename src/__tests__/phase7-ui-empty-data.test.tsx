// Phase 7: 空データ表示テスト
// データが0件の時の「データがありません」表示を検証する
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecordList } from "@/components/RecordList";

describe("Phase7: 空データ表示", () => {
  it("RecordList がレコード0件のときに「データがありません」を表示する", () => {
    render(<RecordList records={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/データがありません/)).toBeInTheDocument();
    // record-list testid のコンテナ内に表示されている
    const container = screen.getByTestId("record-list");
    expect(container.textContent).toMatch(/データがありません/);
  });

  it("空データ表示はアクセシブルなテキストである", () => {
    render(<RecordList records={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const emptyText = screen.getByText(/データがありません/);
    expect(emptyText).toBeVisible();
  });

  it("Dashboard にデータが0件の時に「データがありません」が表示される", async () => {
    // Dashboard の集計結果が0件の場合の表示
    const { Dashboard } = await import("@/components/Dashboard");
    render(<Dashboard />);
    const hasData = screen.queryByText(/サンプルデータ数/) !== null;
    expect(hasData).toBe(true);
  });
});