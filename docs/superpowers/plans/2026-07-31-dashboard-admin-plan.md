# Dashboard と管理画面 テーマ実装 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task‑by‑task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ダッシュボードと管理画面の UI をオレンジ／ホワイトの近未来テーマで装飾し、文字色は既存ロジックを維持したまま外観だけを変更する。

**Architecture:** グローバル CSS カスタムプロパティを定義し、ルートコンテナにクラス `theme-bg` を付与して全体配色を適用。個別コンポーネントは最小限のクラス追加でカード・ボタンの背景色を上書き。

**Tech Stack:** React (TypeScript)、CSS モジュール、Supabase クライアント、Git

## Global Constraints
- 文字色は既存コード (`GRADE_COLORS` など) を変更しないこと。
- 既存ロジック・データ取得・状態管理は一切変更しないこと。
- 変更は CSS/クラス追加のみで、機能テストがすべてパスすること。

---

### Task 1: Add global theme CSS variables

**Files:**
- Create: `capture-app/src/globalTheme.css`

**Interfaces:**
- None (global scope)

- [ ] **Step 1: Write the CSS file**

```css
:root {
  --theme-primary: #FF6600;   /* オレンジアクセント */
  --theme-bg: #FFFFFF;       /* メイン背景 */
  --theme-card-bg: #F9F9F9;   /* カード背景 */
  --theme-border: #E0E0E0;   /* 薄い境界線 */
  --theme-shadow: rgba(0,0,0,0.08); /* 軽い影 */
}
.theme-bg { background: var(--theme-bg); min-height: 100vh; }
```

- [ ] **Step 2: Run lint / type check** (`npm run lint` or `tsc --noEmit`) – should succeed.
- [ ] **Step 3: Commit**

```bash
git add capture-app/src/globalTheme.css
git commit -m "feat: add global theme CSS variables for orange/white theme"
```

### Task 2: Import globalTheme.css in app entry point

**Files:**
- Modify: `capture-app/src/index.tsx`

**Interfaces:**
- None (import side‑effect)

- [ ] **Step 1: Add import line**

```tsx
import "./globalTheme.css"; // Global theme variables
```

- [ ] **Step 2: Verify app still compiles** (`npm run build` or `npm start`).
- [ ] **Step 3: Commit**

```bash
git add capture-app/src/index.tsx
git commit -m "chore: import global theme CSS"
```

### Task 3: Apply theme class to Dashboard root container

**Files:**
- Modify: `capture-app/src/components/Dashboard.tsx`

**Interfaces:**
- The root `<div>` now receives class `theme-bg`.

- [ ] **Step 1: Add className to root `<div>`**

```tsx
return (
  <div className="theme-bg">
    {/* existing content */}
  </div>
);
```

- [ ] **Step 2: Add card and button style overrides**
  *Create a CSS module `Dashboard.module.css` (if not existent) with:*

```css
.card {
  background: var(--theme-card-bg);
  border: 1px solid var(--theme-border);
  box-shadow: 0 2px 4px var(--theme-shadow);
}
.primaryButton {
  background: var(--theme-primary);
  color: #fff;
}
.primaryButton:hover {
  background: rgba(255,102,0,0.9);
}
```
  *Update the component to apply these classes where appropriate (e.g., the outer card `<section>` and any button elements).*

- [ ] **Step 3: Run component storybook / dev server** (`npm run dev`) and visually confirm orange/white theme on Dashboard while ensuring text colors (GRADE_LABELS) remain unchanged.
- [ ] **Step 4: Commit**

```bash
git add capture-app/src/components/Dashboard.tsx capture-app/src/components/Dashboard.module.css
git commit -m "style: apply orange/white theme to Dashboard"
```

### Task 4: Apply theme to AdminLogin (管理画面)

**Files:**
- Modify: `capture-app/src/components/AdminLogin.tsx`

**Interfaces:**
- Root element receives `className="theme-bg"`.

- [ ] **Step 1: Add className to root element**

```tsx
return (
  <div className="theme-bg">
    {/* existing admin login UI */}
  </div>
);
```

- [ ] **Step 2: Add/Update CSS module for admin forms**
  *Create `AdminLogin.module.css` (if missing) with:*

```css
.formContainer {
  background: var(--theme-card-bg);
  border: 1px solid var(--theme-border);
  padding: 1.5rem;
  box-shadow: 0 2px 4px var(--theme-shadow);
}
.input {
  border: 1px solid var(--theme-border);
}
.input:focus {
  outline: 2px solid var(--theme-primary);
}
.submitButton {
  background: var(--theme-primary);
  color: #fff;
}
.submitButton:hover {
  background: rgba(255,102,0,0.9);
}
```
  *Apply these classes to the `<form>`, `<input>` and `<button>` elements in `AdminLogin.tsx`.*

- [ ] **Step 3: Visual verification** (`npm run dev` → `/admin` page) – ensure background is white, primary accent orange, and existing text colors are unchanged.
- [ ] **Step 4: Commit**

```bash
git add capture-app/src/components/AdminLogin.tsx capture-app/src/components/AdminLogin.module.css
git commit -m "style: apply orange/white theme to Admin login page"
```

### Task 5: Add minimal visual regression test (optional but encouraged)

**Files:**
- Create: `capture-app/__tests__/theme.visual.test.ts`

**Interfaces:**
- Uses `@testing-library/react` and `jest-image-snapshot` to capture screenshots of Dashboard and AdminLogin.

- [ ] **Step 1: Add test skeleton**

```tsx
import { render } from "@testing-library/react";
import Dashboard from "../src/components/Dashboard";
import AdminLogin from "../src/components/AdminLogin";
import { toMatchImageSnapshot } from "jest-image-snapshot";

expect.extend({ toMatchImageSnapshot });

test("Dashboard visual snapshot", async () => {
  const { container } = render(<Dashboard records={[]} />);
  expect(container).toMatchImageSnapshot();
});

test("AdminLogin visual snapshot", async () => {
  const { container } = render(<AdminLogin />);
  expect(container).toMatchImageSnapshot();
});
```

- [ ] **Step 2: Install dev dependency** (if not present) – `npm i -D jest-image-snapshot @testing-library/react`.
- [ ] **Step 3: Run tests** (`npm test`) – first run will generate baseline snapshots.
- [ ] **Step 4: Commit**

```bash
git add capture-app/__tests__/theme.visual.test.ts
git commit -m "test: add visual regression tests for theme changes"
```

### Task 6: Run full test suite and ensure all pass

- [ ] **Step 1: Execute** `npm test` (includes existing unit tests + new visual test).
- [ ] **Step 2: If any test fails, debug and fix without altering existing logic.
- [ ] **Step 3: Commit any fixes** (use conventional commit message).

### Task 7: Final clean‑up and push

- [ ] **Step 1: Ensure no stray `TODO` or `FIXME` comments remain.
- [ ] **Step 2: Push branch to remote (if working on a feature branch).**

```bash
git push origin HEAD
```

- [ ] **Step 3: Open a Pull Request** (use UI or `gh pr create`).

---

**Self‑Review Checklist**
- All spec requirements covered? Yes – global variables, imports, Dashboard, AdminLogin, visual verification.
- No placeholders such as `TODO` remain.
- Types and signatures consistent (only UI changes, no new TS types needed).
- Tasks are bite‑sized and each ends with a commit.

**Plan saved** to `capture-app/docs/superpowers/plans/2026-07-31-dashboard-admin-plan.md`.

**Next step:** Choose execution mode.
- **1. Subagent‑Driven Development** (recommended) – I will spawn a subagent per task, review after each commit.
- **2. Inline Execution** – I will run the steps directly in this session.

Which approach would you like?
