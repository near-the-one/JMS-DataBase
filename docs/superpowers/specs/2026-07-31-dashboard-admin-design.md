# Dashboard と管理画面のオレンジ／ホワイト近未来テーマ設計

## 目的
- 文字色は既存コードでハードコーディングされているもの（例: `GRADE_COLORS` 等）は変更せずそのまま保持する。
- 背景・カード・ボタン・入力部品のみを **オレンジ (#FF6600) とホワイト (#FFFFFF)** の配色で近未来感を演出する。
- 既存の UI ロジック・データ取得・状態管理は一切変更せず、外観のみを上書きする。

## カラーパレット（CSS カスタムプロパティ）
```css
:root {
  --theme-primary: #FF6600;   /* オレンジアクセント */
  --theme-bg: #FFFFFF;       /* メイン背景 */
  --theme-card-bg: #F9F9F9;   /* カード背景、微妙なグレイで立体感 */
  --theme-border: #E0E0E0;   /* 薄い境界線 */
  --theme-shadow: rgba(0,0,0,0.08); /* 軽い影 */
}
```
- 変数は **globalTheme.css** に定義し、エントリポイント (`src/index.tsx` 等) でインポートする。
- 必要に応じて `rgba(255,102,0,0.1)` などでホバー時のネオン風エフェクトを付与できる。

## 変更対象コンポーネント
| ファイル | 変更点 | コメント |
|---|---|---|
| `Dashboard.tsx` | ルート `<div>` に `className="theme-bg"` を付与。テーブル・カードの `background` を `var(--theme-card-bg)` に変更。ボタン系は `background: var(--theme-primary)`、文字色は `color: #fff` で上書き。 | 文字色は `GRADE_COLORS` で指定されている箇所はそのまま残す |
| `AdminLogin.tsx` (管理画面全体) | 同様に `className="theme-bg"` をルート要素に付与。フォーム入力はボーダー `var(--theme-border)`、フォーカス時のアウトラインはオレンジに。 | 既存のロジックは変更せず、スタイルのみ上書き |
| `HeaderCard.module.css`（もし使用） | `background` と `border` の値を上記変数で上書き。 | CSS モジュールはインポートされたままなので、変数参照で上書き可能 |

## 実装手順（概要）
1. **globalTheme.css** を `capture-app/src` に作成し、上記カラーパレット変数を記述する。
2. `src/index.tsx`（または最上位エントリ）で `import "./globalTheme.css";` を追加し、全体に変数を適用。
3. `Dashboard.tsx` と `AdminLogin.tsx` のルート要素に `className="theme-bg"` を付与。
4. 必要なスタイルオーバーライドを **Dashboard.module.css** / **AdminLogin.module.css**（存在しない場合はインライン style）で `var(--theme-*)` を利用して記述。例:
   ```css
   .card { background: var(--theme-card-bg); border: 1px solid var(--theme-border); }
   .primaryButton { background: var(--theme-primary); color: #fff; }
   .primaryButton:hover { background: rgba(255,102,0,0.9); }
   ```
5. 文字色がハードコードされている箇所（`GRADE_COLORS` 等）は触らない。
6. ビジュアルチェック：ローカルサーバ (`npm run dev` など) で **ダッシュボード** と **管理画面** を開き、配色が意図通りに反映されているか確認。
7. テスト実行 (`npm test` or `npm run test`) で既存ロジックが壊れていないことを保証。

## テスト観点
- **UI スナップショット**：背景・カード・ボタンの色が変わっているか（文字色は変更なし）
- **機能テスト**：`Dashboard` のデータ取得・フィルタリングロジックはそのまま動作すること。
- **アクセシビリティ**：コントラスト比が WCAG AA 以上になるよう `--theme-primary` の明度を調整可能。

## 今後の拡張
- テーマ切替機構（ライト／ダーク）を追加したい場合は、`:root` に `--theme-mode` を増やし、`data-theme` 属性で切替えるだけで済む設計。
- ネオンエフェクトやグラデーションは `--theme-primary` の透明度を変えるだけで簡単に実装可能。

---

**仕様書作成完了**。この内容で問題なければ、実装タスクを `writing-plans` スキルで作成します。