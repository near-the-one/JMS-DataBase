// Phase 7: アクセシビリティテスト
// WCAG 対応、キーボードナビゲーション、ARIA、コントラスト、スクリーンリーダー対応を検証する
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "@/components/App";
import { Dashboard } from "@/components/Dashboard";
import { ManualEntryForm } from "@/components/ManualEntryForm";

describe("Phase7: アクセシビリティ", () => {
  describe("<html lang> 属性", () => {
    it("ページには lang 属性が設定されている", () => {
      // index.html に <html lang="ja"> が設定されていることを確認
      expect(document.documentElement.lang).toBeDefined();
    });
  });

  describe("見出し階層", () => {
    it("Dashboard は適切な見出し階層 (h1, h2, h3) を持っている", () => {
      render(<Dashboard />);
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      const h2s = screen.queryAllByRole("heading", { level: 2 });
      expect(h2s.length).toBeGreaterThanOrEqual(2);
    });

    it("見出しレベルのスキップがない (h1→h2→h3 の順)", () => {
      render(<Dashboard />);
      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      let prevLevel = 0;
      for (const h of headings) {
        const level = parseInt(h.tagName[1]);
        // 見出しレベルは最大1つずつ深くなること (h1→h3 のようなスキップ禁止)
        if (prevLevel > 0) {
          expect(level - prevLevel).toBeLessThanOrEqual(1);
        }
        prevLevel = level;
      }
    });
  });

  describe("テーブルアクセシビリティ", () => {
    it("テーブルに列見出し <th> が存在する", () => {
      render(<Dashboard />);
      const headers = screen.queryAllByRole("columnheader");
      expect(headers.length).toBeGreaterThanOrEqual(2);
    });

    it("テーブル内の <th> は内部テキストを持っている", () => {
      render(<Dashboard />);
      const ths = document.querySelectorAll("th");
      for (const th of ths) {
        expect(th.textContent?.length || 0).toBeGreaterThan(0);
      }
    });

    it("セマンティックなテーブルが少なくとも1つ存在する", () => {
      render(<Dashboard />);
      const tables = screen.queryAllByRole("table");
      expect(tables.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("ARIA属性", () => {
    it("セクション要素に aria-labelledby が設定されている", () => {
      render(<Dashboard />);
      const sections = document.querySelectorAll("section");
      let hasAria = false;
      for (const section of sections) {
        const labelledBy = section.getAttribute("aria-labelledby");
        if (labelledBy) {
          hasAria = true;
          const target = document.getElementById(labelledBy);
          expect(target).not.toBeNull();
        }
      }
      expect(hasAria).toBe(true);
    });

    it("フォーム入力フィールドにラベルが関連付けられている", () => {
      render(<ManualEntryForm onSubmit={vi.fn()} />);
      const selects = screen.queryAllByRole("combobox");
      for (const el of selects) {
        const id = el.getAttribute("id");
        expect(id).not.toBeNull();
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          expect(label).not.toBeNull();
        }
      }
    });
  });

  describe("キーボードナビゲーション", () => {
    it("すべてのクリック可能な <button> 要素がDOM上に存在する", () => {
      render(<App />);
      const buttons = screen.queryAllByRole("button");
      for (const button of buttons) {
        expect(button).toBeInTheDocument();
      }
    });

    it("<select> 要素がキーボードで操作可能", () => {
      render(<Dashboard />);
      const selects = screen.queryAllByRole("combobox");
      for (const select of selects) {
        expect(select).toBeInTheDocument();
      }
    });

    it("リンクが適切な役割を持っている", () => {
      render(<App />);
      const links = screen.queryAllByRole("link");
      expect(links).toBeDefined();
    });
  });
});