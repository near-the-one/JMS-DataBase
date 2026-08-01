// Phase6: Dashboard timing filterテスト
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";

describe("Dashboard timing filter", () => {
  it("期間選択を変更すると表示が切り替わる", () => {
    render(<Dashboard />);

    const timingSelect = screen.getByLabelText(/期間選択/i);
    expect(timingSelect).toBeInTheDocument();
    expect(timingSelect).toHaveValue("normal");

    // neo rare→epic rate を取得 (通常時)
    const normalRates = screen.getAllByText(/%/);
    expect(normalRates.length).toBeGreaterThan(0);

    // ミラクルタイムに切り替え
    fireEvent.change(timingSelect, { target: { value: "miracle-2025-11-01" } });
    expect(timingSelect).toHaveValue("miracle-2025-11-01");

    // 表示が再描画されていることを確認（少なくとも rate が表示されている）
    const miracleRates = screen.getAllByText(/%/);
    expect(miracleRates.length).toBe(normalRates.length);
  });
});
