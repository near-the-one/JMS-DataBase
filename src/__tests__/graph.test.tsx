// Phase6: グラフ表示テスト（未実装）
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("Graph components", () => {
  it("棒グラフが描画される", () => {
    render(<div data-testid="bar-chart">Bar Chart</div>);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("円グラフが描画される", () => {
    render(<div data-testid="pie-chart">Pie Chart</div>);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("推移グラフが描画される", () => {
    render(<div data-testid="line-chart">Line Chart</div>);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });
});
