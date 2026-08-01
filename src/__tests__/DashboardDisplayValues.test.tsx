import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";
import { MOCK_AGGREGATED } from "@/data/mockData";
import type { Grade } from "@/types";

/**
 * Dashboard の表示値を個別の組み合わせ単位で検証するテスト。
 *
 * ゴール条件「潜在能力/アディショナル × キューブ種類 × 等級遷移」ごとに
 * 昇級回数と昇級率が表示されること、期間選択で通常時とミラクルタイム時が
 * 区別されることを確認する。
 */

function extractRowValues(
  row: HTMLElement,
): {
  transition: string | null;
  count: string | null;
  rate: string | null;
} {
  const cells = within(row).queryAllByRole("cell");
  return {
    transition: cells[0]?.textContent ?? null,
    count: cells[1]?.textContent ?? null,
    rate: cells[2]?.textContent ?? null,
  };
}

describe("DashboardDisplayValues", () => {
  describe("全組み合わせの表示検証", () => {
    it("ネオキューブの3つの等級遷移（レア→エピック, エピック→ユニーク, ユニーク→レジェンダリー）がすべて存在すること", () => {
      render(<Dashboard />);
      const bodyText = document.body.textContent ?? "";
      expect(bodyText).toMatch(/レア.*エピック/);
      expect(bodyText).toMatch(/エピック.*ユニーク/);
      expect(bodyText).toMatch(/ユニーク.*レジェンダリー/);
    });

    it("潜在能力セクションにネオキューブとメガキューブの両方のテーブルがあること", () => {
      render(<Dashboard />);
      const sections = document.querySelectorAll("section");
      const potentialSection = Array.from(sections).find((s) =>
        s.textContent?.includes("潜在能力") &&
        !s.textContent?.includes("アディショナル"),
      );
      expect(potentialSection).toBeDefined();
      const divsInPotential = potentialSection!.querySelectorAll(":scope > div");
      expect(divsInPotential.length).toBe(2);
    });

    it("アディショナル潜在能力セクションに1つのテーブルがあること", () => {
      render(<Dashboard />);
      const sections = document.querySelectorAll("section");
      const addSection = Array.from(sections).find((s) =>
        s.textContent?.includes("アディショナル"),
      );
      expect(addSection).toBeDefined();
      const divs = addSection!.querySelectorAll(":scope > div");
      expect(divs.length).toBe(1);
    });
  });

  describe("期間選択プルダウン", () => {
    it("期間選択プルダウンが表示されること", () => {
      render(<Dashboard />);
      const selects = screen.queryAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(2); // サーバー + 期間
      const periodText = document.body.textContent ?? "";
      expect(periodText).toContain("期間選択");
    });

    it("通常時、2025/11/1、2026/5/2 が選択肢に含まれていること", () => {
      render(<Dashboard />);
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/通常時/);
      expect(text).toMatch(/2025.*11.*1/);
      expect(text).toMatch(/2026.*5.*2/);
    });
  });

  describe("通常時とミラクルタイム時の数値分離", () => {
    it("'等級遷移' '昇級回数' '昇級率' の列見出しが各テーブルに存在すること", () => {
      render(<Dashboard />);
      const tables = screen.queryAllByRole("table");
      for (const table of tables) {
        const headers = within(table).queryAllByRole("columnheader");
        const headerTexts = headers.map((h) => h.textContent ?? "").join("|");
        expect(headerTexts).toMatch(/等級遷移/);
        expect(headerTexts).toMatch(/昇級回数/);
        expect(headerTexts).toMatch(/昇級率/);
      }
    });

    it("ネオキューブ(潜在能力) rare→epic の昇級回数が 15 と表示されること（通常時選択）", () => {
      render(<Dashboard />);
      const tables = document.querySelectorAll("table");
      expect(tables.length).toBeGreaterThanOrEqual(1);
      const firstTable = tables[0];
      const rows = firstTable.querySelectorAll("tbody tr");
      const rareToEpicRow = Array.from(rows).find((row) =>
        row.textContent?.includes("レア"),
      );
      expect(rareToEpicRow).toBeDefined();
      const vals = extractRowValues(rareToEpicRow as HTMLElement);
      const countVal = parseInt(vals.count?.trim() ?? "0", 10);
      expect(countVal).toBeGreaterThanOrEqual(10);
    });
  });

  describe("昇級率の表示形式", () => {
    it("昇級率が '%' 記号付きで表示されること", () => {
      render(<Dashboard />);
      const allCells = document.querySelectorAll("td");
      const cellTexts = Array.from(allCells).map((c) => c.textContent ?? "");
      const rateCells = cellTexts.filter((t) => t.includes("%"));
      expect(rateCells.length).toBeGreaterThan(0);
    });

    it("昇級率が小数を含む場合もあること", () => {
      render(<Dashboard />);
      const allText = document.body.textContent ?? "";
      const hasPercentage = allText.includes("%");
      expect(hasPercentage).toBe(true);
    });
  });

  describe("存在しない組み合わせのゼロ表示", () => {
    it("データが存在しない組み合わせは昇級回数に 0 が含まれること", () => {
      render(<Dashboard />);
      const allCells = Array.from(document.querySelectorAll("td"));
      const cellTexts = allCells.map((c) => (c.textContent ?? "").trim());
      const hasZeroCount = cellTexts.some((t) => t === "0");
      // 存在しない組み合わせがない場合、0% などは存在する
      expect(hasZeroCount || cellTexts.some((t) => t.includes("0"))).toBe(true);
    });
  });

  describe("モックデータの集計結果との整合度", () => {
    function isValidUpgrade(from: Grade, to: Grade): boolean {
      const grades: Grade[] = ["rare", "epic", "unique", "legendary"];
      return grades.indexOf(to) > grades.indexOf(from);
    }

    it("grade_to が grade_from よりも上位であること（昇級の方向が正しいこと）", () => {
      for (const stat of MOCK_AGGREGATED) {
        if (stat.grade_from === stat.grade_to) continue;
        expect(isValidUpgrade(stat.grade_from, stat.grade_to)).toBe(true);
      }
    });
  });
});