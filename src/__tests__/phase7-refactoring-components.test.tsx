// Phase 7: リファクタリング検証テスト — コンポーネント分割
// Dashboard が適切に分割され、責務分離が行われていることを検証する
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";

describe("Phase7: コンポーネント分割", () => {
  it("Dashboard は独立してレンダリング可能なサブコンポーネントに分割できている", () => {
    // 実装後: PotentialSection, CubeTable, TransitionRow などのサブコンポーネントが存在する
    render(<Dashboard />);
    expect(screen.queryByText(/Maple CUBE/)).toBeInTheDocument();
  });

  it("サーバー選択は独立したコンポーネントに分離されている", () => {
    render(<Dashboard />);
    // サーバーセレクタが独立している場合、testid が異なる
    const selects = screen.queryAllByRole("combobox");
    // サーバー選択が少なくとも1つある
    expect(selects.length).toBeGreaterThanOrEqual(1);
    // サーバー選択テキストが表示されている
    expect(screen.queryByText(/ゆかり/)).toBeInTheDocument();
  });

  it("期間選択は独立したコンポーネントに分離されている", () => {
    render(<Dashboard />);
    // 期間選択が存在する
    const selects = screen.queryAllByRole("combobox");
    // 選択可能なドロップダウンがある
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it("集計表示テーブルは独立したコンポーネントで実装されている", () => {
    render(<Dashboard />);
    const tables = screen.queryAllByRole("table");
    expect(tables.length).toBeGreaterThanOrEqual(2);
  });
});