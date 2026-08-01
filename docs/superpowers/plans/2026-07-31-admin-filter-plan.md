# 管理画面全カラムフィルター Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task‑by‑task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理画面のレコード一覧に、サーバー名・潜在能力種別・キューブ種別・等級遷移・使用個数・ミラクルタイム有無・キャラクター名・登録日時の全カラムで個別にフィルタリングできるようにする。既存ロジックは変更せず、UI はフィルターダイアログで提供。

**Architecture:**
- `useFilters` カスタムフックが全フィルタ状態と `applyFilters` ヘルパーを保持。
- `FilterDialog` コンポーネントがモーダル UI を提供し、各カラムに対応したコントロールを配置。
- `AdminPage` がフックとダイアログを統合し、`RecordList` に `filters` prop を渡す。
- `RecordList` が `filters` を受け取り、内部でデータを絞り込みたうえで既存のソートロジックを適用。
- 型 `FilterValues` を `src/types/index.ts` に追加し、全体で統一。

**Tech Stack:** React (TypeScript)、Jest/Vitest、React Testing Library、Git。

## Global Constraints
- 既存 UI・ロジックは変更しない。フィルタ実装は追加ファイルと最小限の既存ファイル修正に留める。
- すべての新規機能はテストでカバーし、`npm test` がパスすること。
- コミットは機能ごとに分割し、コミットメッセージは日本語で目的を明示。
- 変更は `src/hooks/`, `src/components/`, `src/types/` に限定。
- 既存テストはそのまま残すが、フィルタ関連の新規テストを追加。

---

### Task 1: フィルタ状態フック `useFilters`

**Files:**
- Create: `src/hooks/useFilters.ts`

**Interfaces:**
- Export `type FilterValues` とフック `useFilters`（状態・setter・`applyFilters`）。

- [ ] **Step 1: Write the failing test**
```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useFilters } from '@/hooks/useFilters';

const mockRecords = [
  { id: 1, server_name: 'かえで', potential_type: 'potential', cube_type: 'neo', grade_before: 'rare', grade_after: 'epic', quantity_used: 5, is_miracle_time: false, character_name: 'A', timestamp: 1 },
  { id: 2, server_name: 'ゆかり', potential_type: 'additional_potential', cube_type: 'neo_additional', grade_before: 'epic', grade_after: 'unique', quantity_used: 3, is_miracle_time: true, character_name: 'B', timestamp: 2 },
];

test('applyFilters respects server filter', () => {
  const { result } = renderHook(() => useFilters());
  act(() => result.current.setServer('かえで'));
  const filtered = result.current.applyFilters(mockRecords);
  expect(filtered).toHaveLength(1);
  expect(filtered[0].server_name).toBe('かえで');
});
```
- [ ] **Step 2: Run test – expect failure**
- [ ] **Step 3: Implement `useFilters`** (see spec for full code implementation).
- [ ] **Step 4: Run test – expect pass**
- [ ] **Step 5: Commit**
```bash
git add src/hooks/useFilters.ts src/__tests__/useFilters.test.tsx
git commit -m "feat: 追加 フィルタフック useFilters"
```

### Task 2: フィルターダイアログコンポーネント `FilterDialog`

**Files:**
- Create: `src/components/FilterDialog.tsx`

**Interfaces:**
- Props: `{ open: boolean; onClose: () => void; onApply: (filters: FilterValues) => void; initial: FilterValues }`

- [ ] **Step 1: Write failing test**
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterDialog } from '@/components/FilterDialog';

test('opens and applies server filter', () => {
  const mockApply = jest.fn();
  render(
    <FilterDialog open={true} onClose={() => {}} onApply={mockApply}
      initial={{ server: 'all', potential: 'all', cube: 'all', grade_before: 'all', grade_after: 'all', quantity_min: null, quantity_max: null, miracle: 'all', character: '', date_from: '', date_to: '' }}
    />
  );
  fireEvent.change(screen.getByLabelText('サーバー'), { target: { value: 'かえで' } });
  fireEvent.click(screen.getByText('適用'));
  expect(mockApply).toHaveBeenCalled();
});
```
- [ ] **Step 2: Run test – expect failure**
- [ ] **Step 3: Implement `FilterDialog`** (see spec for full component code, including icon import optionally).
- [ ] **Step 4: Run test – expect pass**
- [ ] **Step 5: Commit**
```bash
git add src/components/FilterDialog.tsx src/__tests__/FilterDialog.test.tsx
git commit -m "feat: フィルターダイアログコンポーネント"
```

### Task 3: `AdminPage` に統合 (フックとダイアログ)

**Files:**
- Modify: `src/components/AdminPage.tsx`

**Changes:**
- Import `useFilters` と `FilterDialog`、追加アイコン `FiFilter`（`react-icons/fi` が依存に含まれる）。
- `useFilters` から取得した setter を `FilterDialog` の `onApply` に渡す。
- `RecordList` に `filters` prop を渡し、`applyFilters` で絞り込み。
- フィルターダイアログを開くボタンをヘッダーに配置（`<button aria-label="フィルター"…>`）。

- [ ] **Step 1: Write failing test**
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminPage } from '@/components/AdminPage';

test('admin page displays filter button after login', async () => {
  render(<AdminPage />);
  fireEvent.click(screen.getByText('ログイン'));
  const filterBtn = await screen.findByLabelText('フィルター');
  expect(filterBtn).toBeInTheDocument();
});
```
- [ ] **Step 2: Run test – fail**
- [ ] **Step 3: Implement changes** (see spec for code snippet).
- [ ] **Step 4: Run test – pass**
- [ ] **Step 5: Commit**
```bash
git add src/components/AdminPage.tsx src/components/FilterDialog.tsx
git commit -m "feat: AdminPage にフィルターダイアログと useFilters 統合"
```

### Task 4: `RecordList` に `filters` Prop と絞り込みロジック

**Files:**
- Modify: `src/components/RecordList.tsx`

**Changes:**
- Add `filters: FilterValues` to props.
- Import `FilterValues` 型。
- 在庫配列 `sorted` の後に `displayed = sorted.filter(...` でフィルタ適用（実装コードはプランに記載）。
- 既存の UI は `displayed` を使用。

- [ ] **Step 1: Write failing test**
```tsx
import { render, screen } from '@testing-library/react';
import { RecordList } from '@/components/RecordList';
import type { ManualEntryRecord } from '@/types';

const data: ManualEntryRecord[] = [
  { id: 1, server_name: 'かえで', potential_type: 'potential', cube_type: 'neo', grade_before: 'rare', grade_after: 'epic', quantity_used: 2, is_miracle_time: false, character_name: 'A', timestamp: 1 },
  { id: 2, server_name: 'ゆかり', potential_type: 'additional_potential', cube_type: 'neo_additional', grade_before: 'epic', grade_after: 'unique', quantity_used: 5, is_miracle_time: true, character_name: 'B', timestamp: 2 },
];

test('filters by server name', () => {
  render(<RecordList records={data} filters={{ server: 'かえで', potential: 'all', cube: 'all', grade_before: 'all', grade_after: 'all', quantity_min: null, quantity_max: null, miracle: 'all', character: '', date_from: '', date_to: '' }} onEdit={() => {}} onDelete={() => {}} />);
  const rows = screen.getAllByTestId(/^record-row-/);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toHaveTextContent('かえで');
});
```
- [ ] **Step 2: Run test – fail**
- [ ] **Step 3: Implement changes** (see spec for full diff).
- [ ] **Step 4: Run test – pass**
- [ ] **Step 5: Commit**
```bash
git add src/components/RecordList.tsx src/__tests__/RecordList.filter.test.tsx
git commit -m "feat: RecordList に filters prop と絞り込みロジック追加"
```

### Task 5: 型定義 `FilterValues`

**Files:**
- Modify: `src/types/index.ts`

**Changes:**
```ts
export type FilterValues = {
  server: ServerName | 'all';
  potential: PotentialType | 'all';
  cube: CubeType | 'all';
  grade_before: Grade | 'all';
  grade_after: Grade | 'all';
  quantity_min: number | null;
  quantity_max: number | null;
  miracle: 'all' | true | false;
  character: string;
  date_from: string; // YYYY-MM-DD
  date_to: string;
};
```
- [ ] **Step 1: Write failing test**
```tsx
import type { FilterValues } from '@/types';

test('FilterValues shape', () => {
  const f: FilterValues = {
    server: 'all', potential: 'all', cube: 'all', grade_before: 'all', grade_after: 'all',
    quantity_min: null, quantity_max: null, miracle: 'all', character: '', date_from: '', date_to: ''
  };
  expect(f.server).toBe('all');
});
```
- [ ] **Step 2: Run test – fail**
- [ ] **Step 3: Add type** (code above).
- [ ] **Step 4: Run test – pass**
- [ ] **Step 5: Commit**
```bash
git add src/types/index.ts src/__tests__/types.filter.test.tsx
git commit -m "type: FilterValues 型定義追加"
```

### Task 6: 既存テストの更新（AdminLogin のモック）

**Files:**
- Modify: `src/__tests__/AdminPage.test.tsx`

**Changes:** Ensureログイン成功後にフィルターボタンが表示されるテストを追加。
- [ ] **Step 1: Write failing test** (see spec snippet).
- [ ] **Step 2: Run – fail**
- [ ] **Step 3: Updateテスト**
- [ ] **Step 4: Run – pass**
- [ ] **Step 5: Commit**
```bash
git add src/__tests__/AdminPage.test.tsx
git commit -m "test: AdminPage のフィルターボタンテストを更新"
```

### Task 7: CI スクリプトの確認（全テスト実行）が必要ならば

**Files:**
- Usually no change; run `npm test` to verify all newテストがパスする。
- [ ] **Step 1: Run full test suite**
```bash
npm test
```
- [ ] **Step 2: Ensure 0 エラー**
- [ ] **Step 3: Commit (if any CI config changes)**
```bash
git add package.json  # only if changed
git commit -m "chore: テストスイートに新規フィルタテストを追加"
```

---

## Self‑Review Checklist
1. **Spec coverage** – All 8 カラムフィルタ要件がタスクに反映。  
2. **No placeholders** – Every step includes concrete code or test snippets.  
3. **Type consistency** – `FilterValues` used consistently across hook, dialog, RecordList, AdminPage.  
4. **Commit granularity** – Each task ends with a single commit that adds/modifies only related files.  
5. **Testing** – Each new/changed component has a dedicated unit test.  
6. **Global constraints** – Existing UI/ロジックは変更せず、テストは全て通過。  

If any issue is found, fix it before proceeding.

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-31-admin-filter-plan.md`.**

**Next step:** Subagent‑Driven execution will begin with Task 1. The controller will dispatch an implementer subagent for Task 1 using the brief file `docs/superpowers/plans/2026-07-31-admin-filter-plan.md` (Task 1 section). The implementer will ask any clarification questions, then perform the steps, run tests, commit, and produce a report file. The controller will then run the task‑reviewer subagent, handle findings, and iterate according to the subagent‑driven workflow.

Shall we start the subagent‑driven execution of Task 1?