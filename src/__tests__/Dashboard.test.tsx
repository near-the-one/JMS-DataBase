import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";

describe("Dashboard", () => {
  describe("ページヘッダー", () => {
    it("「PROBABILITY OVERVIEW」というアイブラウが表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/PROBABILITY OVERVIEW/i)).toBeInTheDocument();
    });

    it("「種類ごとの昇級確率」という見出しが表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/種類ごとの昇級確率/)).toBeInTheDocument();
    });

    it("説明文が表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/コミュニティが登録したキューブ使用データから算出したリアルタイム集計です/)).toBeInTheDocument();
    });
  });

  describe("確率カード（prob-card）", () => {
    it("ネオキューブのカードが表示されること", () => {
      render(<Dashboard />);
      // ネオキューブのカードを見つけてから、その中のテキストを確認
      const neoCard = screen.getByText(/ネオキューブ/).closest('.prob-card');
      expect(neoCard).toBeInTheDocument();
      expect(within(neoCard).getByText(/ネオキューブ/)).toBeInTheDocument();
      expect(within(neoCard).getByText(/潜在能力/)).toBeInTheDocument();
      expect(within(neoCard).getByText(/エピック/)).toBeInTheDocument();
      expect(within(neoCard).getByText(/ユニーク/)).toBeInTheDocument();
    });

    it("メガキューブのカードが表示されること", () => {
      render(<Dashboard />);
      // メガキューブのカードを見つけてから、その中のテキストを確認
      const megaCard = screen.getByText(/メガキューブ/).closest('.prob-card');
      expect(megaCard).toBeInTheDocument();
      expect(within(megaCard).getByText(/メガキューブ/)).toBeInTheDocument();
      expect(within(megaCard).getByText(/潜在能力/)).toBeInTheDocument();
      expect(within(megaCard).getByText(/ユニーク/)).toBeInTheDocument();
      expect(within(megaCard).getByText(/レジェンダリー/)).toBeInTheDocument();
    });

    it("ネオアディショナルのカードが表示されること", () => {
      render(<Dashboard />);
      // ネオアディショナルのカードを見つけてから、その中のテキストを確認
      const addCard = screen.getByText(/ネオアディショナル/).closest('.prob-card');
      expect(addCard).toBeInTheDocument();
      expect(within(addCard).getByText(/ネオアディショナル/)).toBeInTheDocument();
      expect(within(addCard).getByText(/アディショナル潜在能力/)).toBeInTheDocument();
      expect(within(addCard).getByText(/レア/)).toBeInTheDocument();
      expect(within(addCard).getByText(/エピック/)).toBeInTheDocument();
    });

    it("各カードに昇級率（%表記）が表示されること", () => {
      render(<Dashboard />);
      const percentElements = screen.queryAllByText(/%/);
      expect(percentElements.length).toBeGreaterThanOrEqual(3);
    });

    it("各カードにサンプル数が表示されること", () => {
      render(<Dashboard />);
      const sampleElements = screen.queryAllByText(/サンプル数/);
      expect(sampleElements.length).toBeGreaterThanOrEqual(3);
    });

    it("各カードにプログレスバーが表示されること", () => {
      render(<Dashboard />);
      const probBars = document.querySelectorAll('.prob-bar');
      expect(probBars.length).toBeGreaterThanOrEqual(3);
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

    it("総サンプル数が表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/総サンプル数/)).toBeInTheDocument();
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
    it("ミラクルタイムバナーが表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/ミラクルタイム開催中/)).toBeInTheDocument();
    });
  });

  describe("Supabase互換のデータ構造", () => {
    it("モックデータがレコード構造を持つこと", async () => {
      const { MOCK_RECORDS } = await import("@/data/mockData");
      expect(MOCK_RECORDS.length).toBeGreaterThan(0);

      for (const record of MOCK_RECORDS) {
        expect(record).toHaveProperty("id");
        expect(record).toHaveProperty("date");
        expect(record).toHaveProperty("server_name");
        expect(record).toHaveProperty("potential_type");
        expect(record).toHaveProperty("cube_type");
        expect(record).toHaveProperty("grade_before");
        expect(record).toHaveProperty("grade_after");
        expect(record).toHaveProperty("quantity_used");
        expect(record).toHaveProperty("upgraded");
        expect(record).toHaveProperty("is_miracle_time");
      }
    });

    it("集計結果の構造が正しいこと", async () => {
      const { MOCK_AGGREGATED } = await import("@/data/mockData");
      expect(MOCK_AGGREGATED.length).toBeGreaterThan(0);

      for (const stat of MOCK_AGGREGATED) {
        expect(stat).toHaveProperty("potential_type");
        expect(stat).toHaveProperty("cube_type");
        expect(stat).toHaveProperty("grade_from");
        expect(stat).toHaveProperty("grade_to");
        expect(stat).toHaveProperty("normal_count");
        expect(stat).toHaveProperty("normal_rate");
        expect(stat).toHaveProperty("miracle_count");
        expect(stat).toHaveProperty("miracle_rate");
      }
    });

    it("モックデータに通常時とミラクルタイム時の両方が含まれていること", async () => {
      const { MOCK_RECORDS } = await import("@/data/mockData");
      const hasNormal = MOCK_RECORDS.some((r) => !r.is_miracle_time);
      const hasMiracle = MOCK_RECORDS.some((r) => r.is_miracle_time);
      expect(hasNormal).toBe(true);
      expect(hasMiracle).toBe(true);
    });
  });

  describe("全キューブ種類・潜在能力種類のカバレッジ", () => {
    it("潜在能力・ネオキューブのデータが含まれていること", async () => {
      const { MOCK_RECORDS } = await import("@/data/mockData");
      const found = MOCK_RECORDS.some(
        (r) =>
          r.potential_type === "potential" &&
          r.cube_type === "neo",
      );
      expect(found).toBe(true);
    });

    it("潜在能力・メガキューブのデータが含まれていること", async () => {
      const { MOCK_RECORDS } = await import("@/data/mockData");
      const found = MOCK_RECORDS.some(
        (r) =>
          r.potential_type === "potential" &&
          r.cube_type === "mega",
      );
      expect(found).toBe(true);
    });

    it("アディショナル潜在能力・ネオアディショナルキューブのデータが含まれていること", async () => {
      const { MOCK_RECORDS } = await import("@/data/mockData");
      const found = MOCK_RECORDS.some(
        (r) =>
          r.potential_type === "additional_potential" &&
          r.cube_type === "neo_additional",
      );
      expect(found).toBe(true);
    });

    it("すべての等級（レア・エピック・ユニーク・レジェンダリー）が集計結果に出ること", async () => {
      const { MOCK_AGGREGATED } = await import("@/data/mockData");
      const allGrades = new Set(
        MOCK_AGGREGATED.flatMap((s) => [s.grade_from, s.grade_to]),
      );
      expect(allGrades.has("rare")).toBe(true);
      expect(allGrades.has("epic")).toBe(true);
      expect(allGrades.has("unique")).toBe(true);
      expect(allGrades.has("legendary")).toBe(true);
    });
  });
});