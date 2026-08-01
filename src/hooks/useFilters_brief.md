# Task 1 Brief – useFilters Hook

**Goal**: Implement a custom React hook `useFilters` that manages filter state for the admin record list.

**Requirements**:
- Export a `type FilterValues` with the following fields:
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
- Provide the hook `useFilters` that returns:
  ```ts
  {
    filters: FilterValues;
    setServer(s: ServerName | 'all'): void;
    setPotential(p: PotentialType | 'all'): void;
    setCube(c: CubeType | 'all'): void;
    setGradeBefore(g: Grade | 'all'): void;
    setGradeAfter(g: Grade | 'all'): void;
    setQuantityMin(n: number | null): void;
    setQuantityMax(n: number | null): void;
    setMiracle(v: 'all' | true | false): void;
    setCharacter(s: string): void;
    setDateFrom(d: string): void;
    setDateTo(d: string): void;
    applyFilters(records: ManualEntryRecord[]): ManualEntryRecord[];
  }
  ```
- Use `useState` for each filter field, initializing all to `'all'` (or `null` for numeric ranges).
- `applyFilters` must filter an array of `ManualEntryRecord` according to each non‑default filter value (e.g., if `filters.server !== 'all'` keep only matching `server_name`).
- The hook should be placed in `src/hooks/useFilters.ts`.

**Testing**:
- Create `src/__tests__/useFilters.test.tsx` with a failing test that asserts filtering by server works (see the plan).
- The test must import the hook, render it with `renderHook`, set a filter via the appropriate setter, call `applyFilters` on a mock record set, and verify the result.

**Commit**:
- After implementation and passing tests, commit with message `feat: 追加 フィルタフック useFilters`.

**Report**:
- Write a short report file at `src/hooks/useFilters_report.md` describing what was done, any decisions, and the final commit hash (the implementer will fill it).

**Note**: Do not modify any other files besides those specified. Ensure the hook uses `useCallback` where appropriate for setters.
