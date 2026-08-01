// Phase6: Dashboard server filterテスト
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";

describe("Dashboard server filter", () => {
  it("サーバー選択を変更すると表示が即時更新される", () => {
    render(<Dashboard />);

    const serverSelect = screen.getByLabelText(/サーバー/i);
    expect(serverSelect).toBeInTheDocument();
    expect(serverSelect).toHaveValue("かえで");

    fireEvent.change(serverSelect, { target: { value: "ゆかり" } });
    expect(serverSelect).toHaveValue("ゆかり");

    // サーバー名表示が変更されていることを確認 (div内に表示)
    const serverDisplay = screen.getByText(/サーバー: ゆかり/);
    expect(serverDisplay).toBeInTheDocument();
  });
});
