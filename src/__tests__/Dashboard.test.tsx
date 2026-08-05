import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";

const mockStatsResponse = {
  stats: [
    {
      potential_type: "potential" as const,
      cube_type: "neo" as const,
      grade_transition: 2 as const,
      grade_transition_label: "エピック → ユニーク",
      is_miracle: false,
      total_quantity: 100,
      count: 50,
      supply_rate: 50,
    },
    {
      potential_type: "potential" as const,
      cube_type: "mega" as const,
      grade_transition: 2 as const,
      grade_transition_label: "エピック → ユニーク",
      is_miracle: false,
      total_quantity: 100,
      count: 50,
      supply_rate: 50,
    },
    {
      potential_type: "additional_potential" as const,
      cube_type: "neo_additional" as const,
      grade_transition: 1 as const,
      grade_transition_label: "レア → エピック",
      is_miracle: false,
      total_quantity: 100,
      count: 50,
      supply_rate: 50,
    },
  ],
  meta: {
    generated_at: "2026-08-02T12:00:00+09:00",
    data_period_start: "2026-07-01T00:00:00+09:00",
    data_period_end: "2026-08-01T23:59:59+09:00",
    total_records: 10,
    latest_created_at: "2026-08-02T12:00:00+09:00",
    cache_hint: { max_age: 300, stale_while_revalidate: 600 },
  },
  participant_users: 5,
  is_miracle_time: false,
};

describe("Dashboard", () => {
  const renderDashboard = (overrides = {}) => {
    return render(
      <Dashboard
        statsResponse={mockStatsResponse}
        participantUsers={5}
        isMiracleTime={false}
        latestUpdatedAt="2026-08-02T12:00:00+09:00"
        {...overrides}
      />
    );
  };

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

  describe("確率カード（cube-card）", () => {
    it("ネオキューブのカードが表示されること", () => {
      renderDashboard();
      // カードヘッドからネオキューブの名前を確認（タブボタンとカード名の2つあるため allByText を使用）
      const neoTexts = screen.getAllByText(/ネオキューブ/);
      expect(neoTexts.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/潜在能力/)).toBeInTheDocument();
      // カードリストからカードを見つける
      const cardList = document.querySelector('.cube-card-list');
      expect(cardList).toBeInTheDocument();
      const cards = cardList?.querySelectorAll('.cube-card');
      expect(cards?.length).toBeGreaterThanOrEqual(1);
    });

    it("メガキューブタブをクリックするとメガキューブのカードが表示されること", () => {
      renderDashboard();
      // メガキューブタブをクリック
      fireEvent.click(screen.getByRole("button", { name: /メガキューブ/ }));
      // カードリストからカードを見つける
      const cardList = document.querySelector('.cube-card-list');
      expect(cardList).toBeInTheDocument();
      const cards = cardList?.querySelectorAll('.cube-card');
      expect(cards?.length).toBeGreaterThanOrEqual(1);
    });

    it("ネオアディショナルタブをクリックするとネオアディショナルのカードが表示されること", () => {
      renderDashboard();
      // ネオアディショナルタブをクリック（タブボタンを明示的に指定）
      const addTab = screen.getByRole("button", { name: /ネオアディショナル/ });
      fireEvent.click(addTab);
      // カードリストを探す
      const cardList = document.querySelector('.cube-card-list');
      expect(cardList).toBeInTheDocument();
      // カードリスト内にカードが表示される（mock dataのみで表示されるカードは1つ）
      const cards = cardList?.querySelectorAll('.cube-card');
      expect(cards?.length).toBeGreaterThanOrEqual(1);
    });

    it("表示中のカードに昇級率（数値）が表示されること", () => {
      renderDashboard();
      // 数値（レート）を含む要素を探す（カード内にあるはず）
      const rateElements = screen.queryAllByText(/\d+\.\d/);
      // mock data only provides 1 transition with rate (grade_transition: 2)
      expect(rateElements.length).toBeGreaterThanOrEqual(1);
    });

    it("表示中のカードにプログレスバーが表示されること", () => {
      renderDashboard();
      const cubeTracks = document.querySelectorAll('.cube-track');
      // mock data only provides 1 transition (grade_transition: 2) for neo
      expect(cubeTracks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("統計ストリップ（stat-strip）", () => {
    it("総サンプル数が表示されること", () => {
      renderDashboard();
      expect(screen.queryByText(/総サンプル数/)).toBeInTheDocument();
    });

    it("2倍未達のキューブが表示されること", () => {
      renderDashboard();
      expect(screen.queryByText(/2倍未達のキューブ/)).toBeInTheDocument();
    });

    it("参加ユーザーが表示されること", () => {
      renderDashboard();
      expect(screen.queryByText(/参加ユーザー/)).toBeInTheDocument();
    });

    it("最終更新が表示されること", () => {
      renderDashboard();
      expect(screen.queryByText(/最終更新/)).toBeInTheDocument();
    });

    it("4つの統計セルが表示されること", () => {
      renderDashboard();
      const statCells = document.querySelectorAll('.stat-cell');
      expect(statCells.length).toBe(4);
    });
  });

  describe("ミラクルバナー", () => {
    it("ミラクルタイムバナーが存在すること（初期は非表示）", () => {
      renderDashboard();
      // バナー要素は存在するが display: none の状態
      const banner = document.querySelector('.miracle-banner');
      expect(banner).toBeInTheDocument();
      expect(banner?.getAttribute('style')).toContain('display: none');
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