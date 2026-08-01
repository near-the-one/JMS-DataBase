# 管理画面フィルタ機能 デザイン仕様

## 目的
管理画面で表示される `RecordList` のデータを、**全カラム**（サーバー名、潜在能力種別、キューブ種別、等級遷移、使用個数、ミラクルタイム有無、キャラクター名、登録日時）ごとに個別に絞り込めるようにする。
既存の UI・ロジックは極力変更せず、フィルタ状態はフックで集中管理し、`RecordList` にはフィルタ適用結果だけを渡す。

## 方針
- **フィルターダイアログ方式** を採用（ヘッダーのフィルターアイコンで開くモーダル）。
- `useFilters` カスタムフックで各カラムの状態を管理し、`applyFilters` ヘルパーでレコード配列をフィルタリング。
- `AdminPage` は `useFilters` を呼び出し、`RecordList` に `filters` と `records` を渡す。
- 既存の `RecordList` のソート機能はそのまま残す。フィルタ適用はソート前に行い、`sorted` の対象はフィルタ済みレコード。
- UI コンポーネントは新規 `FilterDialog`（モーダル）を作成し、各カラムに対応したコントロールを配置。適用・クリアボタンを提供。
- 必要な型は `FilterValues` を `src/types/index.ts` に追加し、`useFilters` の戻り値としてエクスポート。
- 既存テストは変更しないが、フィルタロジック用に新規テスト `src/__tests__/RecordList.filter.test.tsx` を追加予定。

## 変更点
| ファイル | 変更内容 |
|---|---|
| `src/components/AdminPage.tsx` | `useFilters` フック呼び出し、フィルターダイアログ表示ロジック、`RecordList` へ `filters` prop 追加 |
| `src/components/RecordList.tsx` | `filters` prop 受取、`applyFilters` でデータ絞り込み、既存ソートロジックに統合 |
| `src/hooks/useFilters.ts` (新規) | 各カラム `useState`、`setX` 関数、`applyFilters(records)` ヘルパーを実装 |
| `src/components/FilterDialog.tsx` (新規) | フィルターダイアログ UI、`onApply`/`onClear` コールバック |
| `src/types/index.ts` | `export type FilterValues = { server: ServerName | "all"; potential_type: PotentialType | "all"; cube_type: CubeType | "all"; grade_before: Grade | "all"; grade_after: Grade | "all"; quantity_used_min: number | null; quantity_used_max: number | null; is_miracle_time: "all" | true | false; character_name: string; timestamp_from: string; timestamp_to: string; };` |
| `src/__tests__/RecordList.filter.test.tsx` (新規) | フィルタロジックのユニットテスト |

## 実装上の注意点
- `useFilters` は内部で `useState` を使用し、`setX` は `useCallback` でメモ化する。
- `FilterDialog` は `ReactDOM.createPortal` で画面上部にモーダル表示し、`Esc` キーや背景クリックで閉じられるようにする。
- フィルタ適用は `RecordList` の `records` プロパティが変化したときに `useMemo` で再計算し、パフォーマンスを確保。
- `grade_transition` のフィルタは `computeTransition` と同様のロジックで数値化し、`select` のオプションは `1,2,3`（リツ→エピック …）とする。
- 既存の `timestamp` は数値（UNIX epoch）なので、日付入力は `YYYY-MM-DD` 形式で受け取り、`new Date(...).getTime()` に変換して比較。

## 影響範囲
- UI：管理画面にフィルターダイアログが追加され、レイアウトが若干変化しますが、既存コンポーネントの API は変更せず、`RecordList` に `filters` prop を新規追加するだけです。
- ビジネスロジック：データ取得ロジックは変更なし。クライアント側での絞り込みのみ。
- テスト：新規テストを追加し、既存テストはそのまま通過します。

## 次ステップ
1. 上記仕様書をリポジトリにコミット。
2. `writing-plans` スキルを呼び出し、実装計画を作成。

---

*このファイルは `superpowers:brainstorming` のデザイン段階で作成された仕様です。ご確認の上、修正が必要であればご指示ください。*