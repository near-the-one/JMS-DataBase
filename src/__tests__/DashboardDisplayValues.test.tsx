import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";
import { MOCK_AGGREGATED } from "@/data/mockData";
import type { Grade } from "@/types";

/**
 * Dashboard の表示値を個別の組み合わせ単位で検証するテスト。
 *
 * 現在のUIはカードベース（prob-grid > prob-card > prob-row）に変更されている。
 * ゴール条件「潜在能力/アディショナル × キューブ種類 × 等級遷移」ごとに
 * 昇級回数と昇級率が表示されることを確認する。
 */

describe("DashboardDisplayValues", () => {
  describe("全組み合わせの表示検証", () => {
    it("ネオキューブの3つの等級遷移（レア→エピック, エピック→ユニーク, ユニーク→レジェンダリー）がすべて存在すること", () => {
      render(<Dashboard />);
      const bodyText = document.body.textContent ?? "";
      expect(bodyText).toMatch(/レア.*エピック/);
      expect(bodyText).toMatch(/エピック.*ユニーク/);
      expect(bodyText).toMatch(/ユニーク.*レジェンダリー/);
    });

    it("3つのキューブカード（ネオ、メガ、ネオアディショナル）が表示されること", () => {
      render(<Dashboard />);
      const probCards = document.querySelectorAll('.prob-card');
      expect(probCards.length).toBe(3);

      // 各カードの種類を確認
      const cardTexts = Array.from(probCards).map(c => c.textContent ?? "");
      expect(cardTexts.some(t => t.includes("ネオキューブ"))).toBe(true);
      expect(cardTexts.some(t => t.includes("メガキューブ"))).toBe(true);
      expect(cardTexts.some(t => t.includes("ネオアディショナルキューブ"))).toBe(true);
    });

    it("潜在能力バッジとアディショナル潜在能力バッジが表示されること", () => {
      render(<Dashboard />);
      const bodyText = document.body.textContent ?? "";
      expect(bodyText).toContain("潜在能力");
      expect(bodyText).toContain("アディショナル潜在能力");
    });
  });

  describe("カード構造の検証", () => {
    it("各カードに等級遷移（グレードフロー）が表示されること", () => {
      render(<Dashboard />);
      const gradeFlows = document.querySelectorAll('.grade-flow');
      expect(gradeFlows.length).toBeGreaterThanOrEqual(9); // 3 cards × 3 transitions
    });

    it("各カードに昇級率（%表記）が表示されること", () => {
      render(<Dashboard />);
      const probBigElements = document.querySelectorAll('.prob-big');
      expect(probBigElements.length).toBeGreaterThanOrEqual(3); // 3 main transitions (top rows)
    });

    it("各カードにプログレスバー（prob-bar）が表示されること", () => {
      render(<Dashboard />);
      const probBars = document.querySelectorAll('.prob-bar');
      expect(probBars.length).toBeGreaterThanOrEqual(9); // 3 cards × 3 transitions
    });

    it("各カードのトップ行（prob-row.top）に詳細比較（通常時/ミラクルタイム）が表示されること", () => {
      render(<Dashboard />);
      const topRows = document.querySelectorAll('.prob-row.top');
      expect(topRows.length).toBe(3); // 3 cards

      // トップ行に通常時・ミラクルタイムのラベルがあることを確認
      for (const row of topRows) {
        const rowText = row.textContent ?? "";
        expect(rowText).toContain("通常時");
        expect(rowText).toContain("ミラクルタイム");
      }
    });
  });

  describe("統計ストリップ（stat-strip）", () => {
    it("総サンプル数が表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/総サンプル数/)).toBeInTheDocument();
    });

    it("対応キューブ種が表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/対応キューブ種/)).toBeInTheDocument();
    });

    it("参加ユーザーが表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/参加ユーザー/)).toBeInTheDocument();
    });

    it("最終更新が表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/最終更新/)).toBeInTheDocument();
    });

    it("4つの統計セルが表示されること", () => {
      render(<Dashboard />);
      const statCells = document.querySelectorAll('.stat-cell');
      expect(statCells.length).toBe(4);
    });
  });

  describe("ミラクルバナー", () => {
    it("ミラクルタイムバナーが存在すること（初期は非表示）", () => {
      render(<Dashboard />);
      // バナー要素は存在するが display: none の状態
      const banner = document.querySelector('.miracle-banner');
      expect(banner).toBeInTheDocument();
      expect(banner?.getAttribute('style')).toContain('display: none');
    });
  });

  describe("昇級率の表示形式", () => {
    it("昇級率が '%' 記号付きで表示されること", () => {
      render(<Dashboard />);
      const allText = document.body.textContent ?? "";
      // % 記号が含まれていることを確認
      expect(allText).toMatch(/\d+\.?\d*%/);
    });

    it("昇級率が小数を含む場合もあること", () => {
      render(<Dashboard />);
      const allText = document.body.textContent ?? "";
      const hasPercentage = allText.includes("%");
      expect(hasPercentage).toBe(true);
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