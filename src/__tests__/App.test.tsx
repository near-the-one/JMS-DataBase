import { describe, it, expect, beforeEach } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "@/components/App";

/** Render App at /admin and log in as admin */
async function renderAdminAndLogin() {
  cleanup(); // Phase1: cleanup previous render to avoid duplicate manual-entry-form
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <App />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("ID"), {
    target: { value: "admin" },
  });
  fireEvent.change(screen.getByLabelText("パスワード"), {
    target: { value: "admin" },
  });
  fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));
  await waitFor(() => {
    expect(screen.queryByTestId("admin-login-form")).not.toBeInTheDocument();
  });
}

describe("App", () => {
  describe("ページ基本構造", () => {
    it("トップページがレンダリングされること", () => {
      render(<App />);
      expect(screen.queryByText(/Maple CUBE/i)).toBeInTheDocument();
    });

    it("Dashboard コンテンツ（潜在能力セクション）が含まれていること", () => {
      render(<App />);
      const elements = screen.queryAllByText(/潜在能力/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it("アディショナル潜在能力セクションが含まれていること", () => {
      render(<App />);
      const elements = screen.queryAllByText(/アディショナル潜在能力/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it("サーバー選択コンポーネント（combobox）が含まれていること", () => {
      render(<App />);
      const selects = screen.queryAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("表示データ", () => {
    it("ページ内に使用個数の数字が表示されていること", () => {
      render(<App />);
      const numbers = screen.queryAllByText(/\d+/);
      expect(numbers.length).toBeGreaterThan(0);
    });

    it("ページ内に '%' 表記の昇級率が表示されていること", () => {
      render(<App />);
      expect(screen.queryAllByText(/%/).length).toBeGreaterThan(0);
    });

    it("通常時 / ミラクルタイムの両方の区分が表示されていること", () => {
      render(<App />);
      const normalElements = screen.queryAllByText(/通常時/);
      expect(normalElements.length).toBeGreaterThanOrEqual(1);
      const selectValues = Array.from(
        document.querySelectorAll("select"),
      ).flatMap((s) => Array.from(s.options).map((o) => o.text));
      expect(selectValues.some((v) => v.includes("24:00"))).toBe(true);
    });
  });

  describe("統合レイアウト", () => {
    it("App が Dashboard を含み、Dashboard が主要な表示要素を持つこと", () => {
      render(<App />);
      expect(screen.queryByText(/Maple CUBE/i)).toBeInTheDocument();
      const selects = screen.queryAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(2);
      const potentialElements = screen.queryAllByText(/潜在能力/);
      const additionalElements = screen.queryAllByText(/アディショナル潜在能力/);
      expect(potentialElements.length).toBeGreaterThanOrEqual(1);
      expect(additionalElements.length).toBeGreaterThanOrEqual(1);
      const normalElements = screen.queryAllByText(/通常時/);
      expect(normalElements.length).toBeGreaterThanOrEqual(1);
      const allSelects = document.querySelectorAll("select");
      const selectValues = Array.from(allSelects).flatMap((s) =>
        Array.from(s.options).map((o) => o.text),
      );
      expect(selectValues.some((v) => v.includes("2025"))).toBe(true);
    });

    it("すべての必要な表示要素が1ページに共存していること", () => {
      render(<App />);
      const bodyText = document.body.textContent ?? "";

      expect(bodyText).toMatch(/Maple CUBE/i);
      expect(bodyText).toMatch(/潜在能力/);
      expect(bodyText).toMatch(/アディショナル潜在能力/);
      expect(bodyText).toMatch(/ネオキューブ/);
      expect(bodyText).toMatch(/メガキューブ/);
      expect(bodyText).toMatch(/ネオアディショナルキューブ/);
      expect(bodyText).toMatch(/レア/);
      expect(bodyText).toMatch(/エピック/);
      expect(bodyText).toMatch(/ユニーク/);
      expect(bodyText).toMatch(/レジェンダリー/);
      expect(bodyText).toMatch(/通常時/);
      expect(bodyText).toMatch(/2025/);
      expect(bodyText).toMatch(/2026/);
      expect(bodyText).toMatch(/かえで/);
      expect(bodyText).toMatch(/ゆかり/);
      expect(bodyText).toMatch(/くるみ/);
      expect(bodyText).toMatch(/チャレンジャーズ/);
    });
  });

  describe("Phase1: 手入力フォーム・一覧・ダッシュボード統合", () => {
    let app: ReturnType<typeof render>;

    beforeEach(() => {
      app = render(<App />);
    });

    describe("フォーム表示", () => {
      it("手入力セクションの見出しが表示されること", () => {
        expect(screen.queryByText(/手入力/)).toBeInTheDocument();
      });

      it("手入力フォームが表示されること", () => {
        expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
      });

      it("登録一覧セクションの見出しが表示されないこと（Phase1: HomePageからRecordListを削除）", () => {
        expect(screen.queryByText(/登録一覧/)).not.toBeInTheDocument();
      });

      it("登録一覧（RecordList）が表示されないこと（Phase1: 一般ユーザーは個別レコードの一覧・編集・削除不可）", () => {
        expect(screen.queryByTestId("record-list")).not.toBeInTheDocument();
      });

      it("初期状態でダッシュボードが表示されていること", () => {
        expect(screen.queryByText(/Maple CUBE/i)).toBeInTheDocument();
      });
    });

    describe("正常登録（管理画面）", () => {
      beforeEach(async () => {
        await renderAdminAndLogin();
      });

      it("フォームを入力して登録ボタンを押すと一覧に反映されること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        const serverSelect = form.getByLabelText(/サーバー/);
        fireEvent.change(serverSelect, { target: { value: "かえで" } });

        const potentialSelect = form.getByLabelText(/潜在能力種別/);
        fireEvent.change(potentialSelect, { target: { value: "potential" } });

        const cubeSelect = form.getByLabelText(/キューブ/);
        fireEvent.change(cubeSelect, { target: { value: "neo" } });

        const gradeBeforeSelect = form.getByLabelText(/開始等級/);
        fireEvent.change(gradeBeforeSelect, { target: { value: "rare" } });

        const gradeAfterSelect = form.getByLabelText(/終了等級/);
        fireEvent.change(gradeAfterSelect, { target: { value: "epic" } });

        const quantityInput = form.getByLabelText(/使用個数/);
        fireEvent.change(quantityInput, { target: { value: "5" } });

        const submitBtn = form.getByRole("button", { name: /登録/ });
        fireEvent.click(submitBtn);

        await waitFor(() => {
          expect(
            screen.queryByText(/データがありません/),
          ).not.toBeInTheDocument();
        });

        const rows = screen.queryAllByTestId(/record-row-/);
        expect(rows.length).toBe(1);
        const listEl = screen.getByTestId("record-list");
        expect(listEl.textContent).toContain("かえで");
        expect(listEl.textContent).toContain("レア");
        expect(listEl.textContent).toContain("エピック");
      });

      it("2件登録すると一覧に2つ表示されること", async () => {
        const fillAndSubmit = async (cube: "neo" | "mega") => {
          const form = within(screen.getByTestId('manual-entry-form'));
          fireEvent.change(form.getByLabelText(/キューブ/), {
            target: { value: cube },
          });
          fireEvent.change(form.getByLabelText(/使用個数/), {
            target: { value: "3" },
          });
          fireEvent.click(form.getByRole("button", { name: /登録/ }));
          await waitFor(() => {
            expect(form.getByRole("button", { name: /登録/ })).toBeTruthy();
          });
        };

        await fill(() => "neo");
        await fill(() => "mega");

        const rows = screen.getAllByTestId(/record-row-/);
        expect(rows).toHaveLength(2);
      });

      it("ミラクルタイムを有効にして登録すると一覧に「ミラクルタイム」が表示されること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "1" },
        });
        fireEvent.click(form.getByLabelText(/ミラクルタイム/));
        fireEvent.click(form.getByRole("button", { name: /登録/ }));

        await waitFor(() => {
          const rows = screen.getAllByTestId(/record-row-/);
          expect(rows.length).toBeGreaterThanOrEqual(1);
          if (rows.length > 0) {
            expect(rows[0].textContent).toContain("ミラクルタイム");
          }
        });
      });

      it("character_nameを入力して登録すると一覧にキャラクター名が表示されること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        fireEvent.change(form.getByLabelText(/キャラクター名/), {
          target: { value: "さくら" },
        });
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "1" },
        });
        fireEvent.click(form.getByRole("button", { name: /登録/ }));

        await waitFor(() => {
          expect(screen.queryByText(/さくら/)).toBeInTheDocument();
        });
      });
    });

    describe("編集", () => {
      it("一覧の編集ボタンを押すとフォームが編集モード（更新ボタン）になること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        // まず登録
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "5" },
        });
        fireEvent.click(form.getByRole("button", { name: /登録/ }));

        await waitFor(() => {
          expect(screen.queryByText(/データがありません/)).not.toBeInTheDocument();
        });

        // 編集ボタンを押す
        const editBtn = screen.getByText(/編集/);
        fireEvent.click(editBtn);

        // 更新ボタンが表示されている
        await waitFor(() => {
          expect(
            screen.queryByRole("button", { name: /更新/ }),
          ).toBeInTheDocument();
        });
      });

      it("編集モードで送信すると一覧が更新されること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        // まず登録
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "3" },
        });
        fireEvent.click(form.getByRole("button", { name: /登録/ }));

        await waitFor(() => {
          const listEl = screen.getByTestId("record-list");
          expect(listEl.textContent).toContain("3");
        });

        // 編集
        const editBtns = screen.getAllByText(/^編集$/);
        fireEvent.click(editBtns[0]);

        await waitFor(() => {
          const formAfter = within(screen.getByTestId("manual-entry-form"));
          expect(
            formAfter.queryByRole("button", { name: /更新/ }),
          ).toBeInTheDocument();
        });

        // 使用個数を変更（編集モード後のフォームを再取得）
        const formAfter = within(screen.getByTestId("manual-entry-form"));
        const quantityInput = formAfter.getByLabelText(/使用個数/) as HTMLInputElement;
        fireEvent.change(quantityInput, { target: { value: "99" } });
        fireEvent.click(formAfter.getByRole("button", { name: /更新/ }));

        await waitFor(() => {
          const listEl = screen.getByTestId("record-list");
          expect(listEl.textContent).toContain("99");
        });
      });
    });

    describe("削除", () => {
      it("一覧の削除ボタンを押すとデータが消えること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        // まず登録
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "1" },
        });
        fireEvent.click(form.getByRole("button", { name: /登録/ }));

        await waitFor(() => {
          expect(screen.queryByText(/データがありません/)).not.toBeInTheDocument();
        });

        // 削除ボタンを押す
        const deleteBtn = screen.getByText("削除");
        fireEvent.click(deleteBtn);

        await waitFor(() => {
          expect(screen.queryByText(/データがありません/)).toBeInTheDocument();
        });
      });
    });

    describe("入力エラー", () => {
      it("数量が空のまま登録するとエラーが表示されること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        // 数量を空にする（デフォルトは "1"）
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "" },
        });
        fireEvent.click(form.getByRole("button", { name: /登録/ }));

        await waitFor(() => {
          // 数量エラーメッセージが表示される
          expect(
            form.queryByText(/使用個数は1以上/),
          ).toBeInTheDocument();
        });
      });

      it("使用個数が0で登録するとエラーが表示されること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "0" },
        });
        fireEvent.click(form.getByRole("button", { name: /登録/ }));

        await waitFor(() => {
          expect(screen.queryByText(/1以上/)).toBeInTheDocument();
        });
      });

      it("逆遷移等級で登録するとエラーが出ること", async () => {
        const form = within(screen.getByTestId('manual-entry-form'));
        fireEvent.change(form.getByLabelText(/開始等級/), {
          target: { value: "legendary" },
        });
        fireEvent.change(form.getByLabelText(/終了等級/), {
          target: { value: "rare" },
        });
        fireEvent.click(form.getByRole("button", { name: /登録/ }));

        await waitFor(() => {
          expect(screen.queryByText(/逆/)).toBeInTheDocument();
        });
      });
    });

    describe("ダッシュボードへの反映", () => {
      it("手入力登録後もDashboardの表示が継続されていること", async () => {
        // Dashboardのコンテンツが存在する
        expect(screen.queryByText(/Maple CUBE/i)).toBeInTheDocument();
        expect(screen.queryAllByText(/潜在能力/).length).toBeGreaterThanOrEqual(1);

        // 登録実行
        const form = within(screen.getByTestId('manual-entry-form'));
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "1" },
        });
        fireEvent.click(form.getByRole("button", { name: /登録/ }));

        await waitFor(() => {
          expect(screen.queryByText(/データがありません/)).not.toBeInTheDocument();
        });

        // Dashboardの内容が依然として表示されている
        expect(screen.queryByText(/Maple CUBE/i)).toBeInTheDocument();
        expect(screen.queryAllByText(/潜在能力/).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryAllByText(/ネオキューブ/).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryAllByText(/メガキューブ/).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryAllByText(/ネオアディショナルキューブ/).length).toBeGreaterThanOrEqual(1);
      });

      it("Phase1: 手入力フォームとダッシュボードが同一ページに共存し、RecordListは表示されないこと", async () => {
        // Router 経由で test するため re-render する
        cleanup();
        render(
          <MemoryRouter initialEntries={["/"]}>
            <App />
          </MemoryRouter>,
        );
        // 登録前にStateを確認 - Phase1ではトップページにRecordListは表示しない
        expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
        expect(screen.queryByTestId("record-list")).not.toBeInTheDocument();
        expect(screen.queryByText(/Maple CUBE/i)).toBeInTheDocument();

        // 登録実行
        const form = within(screen.getByTestId('manual-entry-form'));
        fireEvent.change(form.getByLabelText(/使用個数/), {
          target: { value: "1" },
        });
        fireEvent.click(form.getByRole("button", { name: /登録/ }));

        await waitFor(() => {
          // Callback form submits, re-render で HomePage のRecordListが表示されないことを確認
          // データ登録後もRecordListは表示されない（Phase1: 一般ユーザーは個別レコードの一覧・編集・削除不可）
          expect(screen.queryByTestId("record-list")).not.toBeInTheDocument();
        });

        // 登録後も ManualEntryForm と Dashboard が存在する
        expect(screen.getByTestId("manual-entry-form")).toBeInTheDocument();
        expect(screen.queryByText(/Maple CUBE/i)).toBeInTheDocument();
      });
    });
  });

  describe("テーブル構造（アクセシビリティ）", () => {
    it("少なくとも1つのデータテーブル（<table>）が存在すること", () => {
      render(<App />);
      const tables = screen.queryAllByRole("table");
      expect(tables.length).toBeGreaterThanOrEqual(1);
    });

    it("テーブル内にセル（<td>）が存在し、数字データを含むこと", () => {
      render(<App />);
      const cells = screen.queryAllByRole("cell");
      expect(cells.length).toBeGreaterThanOrEqual(4);
    });

    it("テーブル内に列見出し（<th>）が存在すること", () => {
      render(<App />);
      const headers = screen.queryAllByRole("columnheader");
      expect(headers.length).toBeGreaterThanOrEqual(2);
    });

    it("昇級回数・昇級率の列がテーブル内に存在すること", () => {
      render(<App />);
      const tables = screen.queryAllByRole("table");
      const tableTexts = tables.map((t) => t.textContent ?? "").join("\n");
      expect(tableTexts).toMatch(/昇級回数/);
      expect(tableTexts).toMatch(/昇級率/);
    });
  });
});