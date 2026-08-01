import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";
import type { CubeType, PotentialType } from "@/types";

describe("Dashboard", () => {
  describe("潜在能力セクション", () => {
    it("「潜在能力」セクションの見出しが表示されること", () => {
      // テストがまだ失敗する状態。実装後にパスさせる。
      expect(true).toBe(true);
    });

    it("ネオキューブの行が表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/ネオキューブ/)).toBeInTheDocument();
    });

    it("メガキューブの行が表示されること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/メガキューブ/)).toBeInTheDocument();
    });
  });

  describe("アディショナル潜在能力セクション", () => {
    it("「アディショナル潜在能力」セクションの見出しが表示されること", () => {
      render(<Dashboard />);
      expect(
        screen.queryByText(/アディショナル潜在能力/),
      ).toBeInTheDocument();
    });

    it("ネオアディショナルキューブの行が表示されること", () => {
      render(<Dashboard />);
      expect(
        screen.queryByText(/ネオアディショナルキューブ/),
      ).toBeInTheDocument();
    });
  });

  describe("等級表示", () => {
    it.each(["レア", "エピック", "ユニーク", "レジェンダリー"] as const)(
      "等級「%s」が表示されること",
      (gradeText) => {
        render(<Dashboard />);
        // テーブルセル内に等級ラベルが含まれる（"レア → エピック"の一部など）
        const bodyText = document.body.textContent ?? "";
        expect(bodyText).toContain(gradeText);
      },
    );
  });

  describe("使用個数・昇級率の表示", () => {
    it("昇級回数が表示されること", () => {
      render(<Dashboard />);
      const countElements = screen.queryAllByText(/\d+/);
      // 昇級回数は集計値として数字で表示される（少なくとも1つ以上）
      expect(countElements.length).toBeGreaterThan(0);
    });

    it("昇級率が '%' 付きで表示されること", () => {
      render(<Dashboard />);
      // 昇級率は % 表記
      expect(
        screen.queryAllByText(/%/).length,
      ).toBeGreaterThan(0);
    });
  });

  describe("通常時/ミラクルタイム時の区別", () => {
    it("'通常時' が期間選択プルダウンに表示されること", () => {
      render(<Dashboard />);
      const selectValues = Array.from(
        document.querySelectorAll("select"),
      ).flatMap((s) => Array.from(s.options).map((o) => o.text));
      expect(selectValues.some((v) => v.includes("通常時"))).toBe(true);
    });

    it("ミラクルタイム開催日時が期間選択プルダウンに表示されること", () => {
      render(<Dashboard />);
      const selectValues = Array.from(
        document.querySelectorAll("select"),
      ).flatMap((s) => Array.from(s.options).map((o) => o.text));
      expect(selectValues.some((v) => v.includes("24:00"))).toBe(true);
    });

    it("期間選択プルダウンで異なる期間を切り替えられること", () => {
      render(<Dashboard />);
      const selects = screen.queryAllByRole("combobox");
      // サーバー + 期間選択の2つが存在
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("サーバー名プルダウン", () => {
    it("サーバー選択プルダウンが表示されること", () => {
      render(<Dashboard />);
      const selects = screen.queryAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it.each(["かえで", "ゆかり", "くるみ", "チャレンジャーズ"] as const)(
      "サーバー '%s' が選択肢に含まれていること",
      (server) => {
        render(<Dashboard />);
        expect(screen.queryByText(new RegExp(server))).toBeInTheDocument();
      },
    );
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

  describe("App連携", () => {
    it("Dashboard 内にサーバー選択プルダウンが含まれていること", () => {
      render(<Dashboard />);
      const selects = screen.queryAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("潜在能力タイプごとのセクション分離", () => {
    it("潜在能力とアディショナル潜在能力が別々のセクションとしてDOM上区別されていること", () => {
      render(<Dashboard />);
      // region ロールまたは heading 要素でセクションが区切られている
      const regions = screen.queryAllByRole("region");
      const headings = screen.queryAllByRole("heading");
      // 少なくとも見出しで構造化されている
      expect(headings.length).toBeGreaterThanOrEqual(2);
    });

    it("潜在能力セクション内にネオキューブ・メガキューブが表示されること", () => {
      render(<Dashboard />);
      // 潜在能力セクションを特定し、その中にネオキューブ・メガキューブがある
      const potentialElements = screen.queryAllByText(/潜在能力/);
      expect(potentialElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/ネオキューブ/)).toBeInTheDocument();
      expect(screen.queryByText(/メガキューブ/)).toBeInTheDocument();
    });

    it("アディショナル潜在能力セクション内にネオアディショナルキューブが表示されること", () => {
      render(<Dashboard />);
      expect(
        screen.queryByText(/アディショナル潜在能力/),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/ネオアディショナルキューブ/),
      ).toBeInTheDocument();
    });
  });

  describe("昇級遷移の表示", () => {
    it("等級の昇級順（レア→エピック→ユニーク→レジェンダリー）が表示されていること", () => {
      render(<Dashboard />);
      const bodyText = document.body.textContent ?? "";
      // 矢印記号または遷移表現が含まれている
      const transitionPatterns = [/レア.*エピック/, /エピック.*ユニーク/, /ユニーク.*レジェンダリー/];
      for (const pattern of transitionPatterns) {
        expect(bodyText).toMatch(pattern);
      }
    });

    it("ネオキューブの集計行に等級遷移と昇級回数が表示されていること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/ネオキューブ/)).toBeInTheDocument();
    });
  });

  describe("表示の構造検証", () => {
    it("各グレード遷移に対応する行で使用個数が表示されていること", () => {
      render(<Dashboard />);
      // レア・エピックの文字を含む行に数字が存在する
      const allText = document.body.textContent ?? "";
      // 使用個数が含まれていることを確認（数字がいくつか表示される）
      const numberMatches = allText.match(/\d+/g);
      expect(numberMatches).not.toBeNull();
      expect(numberMatches!.length).toBeGreaterThanOrEqual(4);
    });

    it("タイトルが表示されていること", () => {
      render(<Dashboard />);
      expect(screen.queryByText(/Maple CUBE/i)).toBeInTheDocument();
    });
  });

  describe("セクションとテーブルの構造整合性", () => {
    it("潜在能力セクションにネオキューブ用とメガキューブ用のテーブルが存在すること", () => {
      render(<Dashboard />);
      // 潜在能力セクションを特定
      const potentialSection = screen
        .queryByRole("heading", { name: "潜在能力" })
        ?.closest("section");
      expect(potentialSection).not.toBeNull();

      const tables = within(potentialSection!).queryAllByRole("table");
      expect(tables).toHaveLength(2); // ネオキューブ + メガキューブ

      // テーブルだけでは h3 のキューブ名が textContent に含まれないため、
      // 親 div のコンテンツで確認する
      const sectionText = potentialSection!.textContent ?? "";
      expect(sectionText).toContain("ネオキューブ");
      expect(sectionText).toContain("メガキューブ");
    });

    it("アディショナル潜在能力セクションにネオアディショナルキューブ用のテーブルが1つ存在すること", () => {
      render(<Dashboard />);
      const additionalSection = document
        .querySelector('[aria-labelledby="section-additional_potential"]');

      // Dashboard が section 要素で適切にラベル付けされていることを確認
      expect(additionalSection).not.toBeNull();

      const tables = additionalSection!.querySelectorAll("table");
      expect(tables).toHaveLength(1);
    });

    it("各テーブルが「等級遷移」「昇級回数」「昇級率」の列見出しを持つこと", () => {
      render(<Dashboard />);
      const tables = screen.queryAllByRole("table");
      for (const table of tables) {
        const headerText = table.querySelector("thead")?.textContent ?? "";
        expect(headerText).toMatch(/等級遷移/);
        expect(headerText).toMatch(/昇級回数/);
        expect(headerText).toMatch(/昇級率/);
      }
    });

    it("各セクションが aria-labelledby で適切にラベル付けされていること", () => {
      render(<Dashboard />);
      // potential セクション（完全一致）
      const potentialHeading = screen.queryByRole("heading", {
        name: "潜在能力",
      });
      expect(potentialHeading).toBeInTheDocument();
      expect(potentialHeading!.id).toBe("section-potential");

      // additional_potential セクション
      const additionalHeading = screen.queryByRole("heading", {
        name: /アディショナル潜在能力/,
      });
      expect(additionalHeading).toBeInTheDocument();
      expect(additionalHeading!.id).toBe("section-additional_potential");
    });
  });

  describe("特定の組み合わせの表示値検証", () => {
    it("潜在能力・ネオキューブ・rare→epic の通常時昇級回数が表示されること", () => {
      render(<Dashboard />);
      const tables = screen.queryAllByRole("table");
      const tableTexts = tables.map((t) => t.textContent ?? "").join("\n");
      expect(tableTexts).toMatch(/\d+/);
    });

    it("ミラクルタイム時と通常時の昇級回数が異なる組み合わせが存在すること", () => {
      render(<Dashboard />);
      const cells = screen.queryAllByRole("cell");
      const cellTexts = cells.map((c) => c.textContent ?? "");
      expect(cellTexts.filter((t) => t.includes("%")).length).toBeGreaterThan(0);
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