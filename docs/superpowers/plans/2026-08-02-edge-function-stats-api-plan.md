# Edge Function Stats API 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase Edge Function で統計集計エンドポイントを作成し、フロントエンドをそこから定期同期するように切り替える。機密情報（id, character_name, server_name等）を外部に漏らさず、集計結果のみをパブリックAPIとして提供する。

**Architecture:** 
- Edge Function (Deno/TypeScript) で `cube_usage_events` と `miracle_time_schedules` を結合・集計し、必要最小限のカラムのみ返却
- フロントエンドは `useCubeStats` フックで 5〜10分間隔でポーリング
- CORS 全許可で外部サイトからも利用可能

**Tech Stack:** Supabase Edge Functions (Deno), @supabase/supabase-js v2, React 19, TypeScript, Vite

## Global Constraints
- 機密カラム（id, character_name, part）をレスポンスに含めない
- grade_transition (1-3) は API 側でラベル変換して返却（1=レア→エピック, 2=エピック→ユニーク, 3=ユニーク→レジェンダリー）
- 同期間隔: デフォルト 5分 (300000ms)、設定可能
- JWT/認証不要（anon key 相当の公開エンドポイント）
- 既存の `SupabaseRecordRepository.getCubeUsageStats()` 呼び出しを `useCubeStats` に置き換え
- TypeScript strict モード、型安全性必須

---

### Task 1: 型定義の追加

**Files:**
- Create: `src/types/api.ts`

**Interfaces:**
- Produces: `CubeStatsResponse`, `CubeStatsParams`, `UseCubeStatsOptions`, `CubeStatsState`

- [ ] **Step 1: Create `src/types/api.ts` with response and parameter types**

```typescript
// src/types/api.ts
/** 統計APIレスポンス */
export interface CubeStatsResponse {
  stats: Array<{
    potential_type: "potential" | "additional_potential";
    cube_type: "neo" | "mega" | "neo_additional";
    grade_transition: 1 | 2 | 3;
    grade_transition_label: string;
    is_miracle: boolean;
    total_quantity: number;
    count: number;
    supply_rate: number;
  }>;
  meta: {
    generated_at: string;
    data_period_start: string;
    data_period_end: string;
    total_records: number;
    cache_hint: {
      max_age: number;
      stale_while_revalidate: number;
    };
  };
}

/** 統計APIクエリパラメータ */
export interface CubeStatsParams {
  since?: string;  // ISO8601 datetime
  potential_type?: "potential" | "additional_potential";
  cube_type?: "neo" | "mega" | "neo_additional";
  grade_transition?: 1 | 2 | 3;
  is_miracle?: boolean;
}

/** useCubeStats フックのオプション */
export interface UseCubeStatsOptions {
  intervalMs?: number;        // デフォルト: 300000 (5分)
  enabled?: boolean;          // デフォルト: true
  params?: CubeStatsParams;
}

/** useCubeStats フックの戻り値 */
export interface CubeStatsState {
  data: CubeStatsResponse | null;
  isLoading: boolean;
  error: Error | null;
  lastFetched: Date | null;
  refetch: () => Promise<void>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/types/api.ts
git commit -m "feat: add CubeStats API type definitions"
```

---

### Task 2: Edge Function 実装 - 共通ユーティリティ

**Files:**
- Create: `supabase/functions/cube-stats/_shared/cors.ts`
- Create: `supabase/functions/cube-stats/_shared/datetime.ts`
- Create: `supabase/functions/cube-stats/deno.json`

**Interfaces:**
- Consumes: None
- Produces: `corsHeaders`, `toJstNaiveTimestamp`, `fromJstNaiveTimestamp`

- [ ] **Step 1: Create CORS headers utility**

```typescript
// supabase/functions/cube-stats/_shared/cors.ts
// 外部公開APIのため全オリジン許可
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
```

- [ ] **Step 2: Create datetime utilities (JST naive timestamp 変換)**

```typescript
// supabase/functions/cube-stats/_shared/datetime.ts
// timestamp カラムは tz なしの `timestamp` 型で、JSTの値をそのまま(オフセット無しで)保存する設計。
// epoch(ms) から JST の生の日時文字列を作る。
export function toJstNaiveTimestamp(epochMs: number): string {
  const d = new Date(epochMs + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// DBの timestamp (JSTのnaive文字列 or 既にオフセット付き) を epoch(ms) に変換する。
export function fromJstNaiveTimestamp(value: string): number {
  const hasOffset = /[Zz]|[+-]\d{2}:?\d{2}$/.test(value);
  const iso = hasOffset ? value : `${value.replace(" ", "T")}+09:00`;
  return new Date(iso).getTime();
}
```

- [ ] **Step 3: Create deno.json with imports**

```json
// supabase/functions/cube-stats/deno.json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
    "std/": "https://deno.land/std@0.224.0/"
  }
}
```

- [ ] **Step 4: Verify files exist**

Run: `ls -la supabase/functions/cube-stats/_shared/`
Expected: cors.ts, datetime.ts present

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/cube-stats/_shared/cors.ts supabase/functions/cube-stats/_shared/datetime.ts supabase/functions/cube-stats/deno.json
git commit -m "feat: add Edge Function shared utilities (CORS, datetime)"
```

---

### Task 3: Edge Function 実装 - メインエントリーポイント

**Files:**
- Create: `supabase/functions/cube-stats/index.ts`

**Interfaces:**
- Consumes: `corsHeaders`, `toJstNaiveTimestamp`, `fromJstNaiveTimestamp` from _shared
- Produces: HTTP handler for GET /functions/v1/cube-stats

- [ ] **Step 1: Create main index.ts with parameter validation, aggregation logic, and HTTP handler**

```typescript
// supabase/functions/cube-stats/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./_shared/cors.ts";
import { fromJstNaiveTimestamp, toJstNaiveTimestamp } from "./_shared/datetime.ts";

const GRADE_TRANSITION_LABELS: Record<number, string> = {
  1: "レア → エピック",
  2: "エピック → ユニーク",
  3: "ユニーク → レジェンダリー",
};

interface Params {
  since: Date;
  potential_type?: "potential" | "additional_potential";
  cube_type?: "neo" | "mega" | "neo_additional";
  grade_transition?: 1 | 2 | 3;
  is_miracle?: boolean;
}

function validateParams(searchParams: URLSearchParams): Params {
  const since = searchParams.get("since");
  const potential_type = searchParams.get("potential_type");
  const cube_type = searchParams.get("cube_type");
  const grade_transition = searchParams.get("grade_transition");
  const is_miracle = searchParams.get("is_miracle");

  if (potential_type && !["potential", "additional_potential"].includes(potential_type)) {
    throw { status: 400, code: "INVALID_PARAMETER", error: "Invalid potential_type. Must be 'potential' or 'additional_potential'" };
  }
  if (cube_type && !["neo", "mega", "neo_additional"].includes(cube_type)) {
    throw { status: 400, code: "INVALID_PARAMETER", error: "Invalid cube_type. Must be 'neo', 'mega', or 'neo_additional'" };
  }
  if (grade_transition && !["1", "2", "3"].includes(grade_transition)) {
    throw { status: 400, code: "INVALID_PARAMETER", error: "Invalid grade_transition. Must be '1', '2', or '3'" };
  }
  if (is_miracle && !["true", "false"].includes(is_miracle)) {
    throw { status: 400, code: "INVALID_PARAMETER", error: "Invalid is_miracle. Must be 'true' or 'false'" };
  }
  if (since && isNaN(Date.parse(since))) {
    throw { status: 400, code: "INVALID_PARAMETER", error: "Invalid since format. Use ISO8601 datetime" };
  }

  return {
    since: since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000),
    potential_type: potential_type as Params["potential_type"],
    cube_type: cube_type as Params["cube_type"],
    grade_transition: grade_transition ? parseInt(grade_transition, 10) as 1 | 2 | 3 : undefined,
    is_miracle: is_miracle === "true" ? true : is_miracle === "false" ? false : undefined,
  };
}

async function aggregateStats(supabase: any, params: Params) {
  // 必要なカラムのみ取得（機密情報を除外）
  // grade_before/grade_after はDBに存在せず、grade_transition (1-3) で管理
  let query = supabase
    .from("cube_usage_events")
    .select("potential_type, cube_type, grade_transition, quantity_used, timestamp");

  if (params.potential_type) query = query.eq("potential_type", params.potential_type);
  if (params.cube_type) query = query.eq("cube_type", params.cube_type);
  if (params.grade_transition) query = query.eq("grade_transition", params.grade_transition);
  if (params.since) {
    const sinceStr = toJstNaiveTimestamp(params.since.getTime());
    query = query.gte("timestamp", sinceStr);
  }

  const { data: events, error: evErr } = await query;
  if (evErr) throw { status: 500, code: "INTERNAL_ERROR", error: evErr.message };

  // ミラクルタイムスケジュール取得
  const { data: schedules, error: schErr } = await supabase
    .from("miracle_time_schedules")
    .select("start,end");
  if (schErr) throw { status: 500, code: "INTERNAL_ERROR", error: schErr.message };

  // ミラクルタイム判定ヘルパー
  const isInMiracle = (ts: string | null) => {
    if (!ts) return false;
    const time = fromJstNaiveTimestamp(ts);
    return (schedules || []).some((s: any) => {
      const start = fromJstNaiveTimestamp(s.start);
      const end = fromJstNaiveTimestamp(s.end);
      return time >= start && time <= end;
    });
  };

  // グルーピング & 集計
  const map = new Map<string, {
    potential_type: string;
    cube_type: string;
    grade_transition: number;
    is_miracle: boolean;
    total_quantity: number;
    count: number;
  }>();

  let dataPeriodStart: number | null = null;
  let dataPeriodEnd: number | null = null;

  for (const r of events || []) {
    const miracle = isInMiracle(r.timestamp);
    if (params.is_miracle !== undefined && miracle !== params.is_miracle) continue;

    const key = `${r.potential_type}|${r.cube_type}|${r.grade_transition}|${miracle}`;
    if (!map.has(key)) {
      map.set(key, {
        potential_type: r.potential_type,
        cube_type: r.cube_type,
        grade_transition: r.grade_transition,
        is_miracle: miracle,
        total_quantity: 0,
        count: 0,
      });
    }
    const agg = map.get(key)!;
    agg.total_quantity += Number(r.quantity_used) || 0;
    agg.count += 1;

    const ts = fromJstNaiveTimestamp(r.timestamp);
    if (dataPeriodStart === null || ts < dataPeriodStart) dataPeriodStart = ts;
    if (dataPeriodEnd === null || ts > dataPeriodEnd) dataPeriodEnd = ts;
  }

  // 結果整形
  const stats = [];
  let totalRecords = 0;
  for (const agg of map.values()) {
    stats.push({
      ...agg,
      grade_transition_label: GRADE_TRANSITION_LABELS[agg.grade_transition] ?? "",
      supply_rate: agg.total_quantity ? (agg.count / agg.total_quantity) * 100 : 0,
    });
    totalRecords += agg.count;
  }

  // ソート
  stats.sort((a, b) => {
    if (a.potential_type !== b.potential_type) return a.potential_type.localeCompare(b.potential_type);
    if (a.cube_type !== b.cube_type) return a.cube_type.localeCompare(b.cube_type);
    if (a.grade_transition !== b.grade_transition) return a.grade_transition - b.grade_transition;
    return a.is_miracle === b.is_miracle ? 0 : a.is_miracle ? 1 : -1;
  });

  const now = new Date();
  const toJstISO = (date: Date) => date.toISOString().replace("Z", "+09:00").replace(/\.\d+/, "");

  return {
    stats,
    meta: {
      generated_at: toJstISO(now),
      data_period_start: dataPeriodStart ? toJstISO(new Date(dataPeriodStart)) : toJstISO(now),
      data_period_end: dataPeriodEnd ? toJstISO(new Date(dataPeriodEnd)) : toJstISO(now),
      total_records: totalRecords,
      cache_hint: {
        max_age: 300,
        stale_while_revalidate: 600,
      },
    },
  };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params = validateParams(url.searchParams);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const result = await aggregateStats(supabase, params);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    const status = err.status || 500;
    const code = err.code || "INTERNAL_ERROR";
    const error = err.error || "Internal server error";
    return new Response(JSON.stringify({ error, code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
```

- [ ] **Step 2: Verify syntax (no TypeScript compile for Deno, but check structure)**

Run: `ls -la supabase/functions/cube-stats/index.ts`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/cube-stats/index.ts
git commit -m "feat: implement cube-stats Edge Function endpoint"
```

---

### Task 4: フロントエンド用フック `useCubeStats` 作成

**Files:**
- Create: `src/hooks/useCubeStats.ts`

**Interfaces:**
- Consumes: `CubeStatsResponse`, `CubeStatsParams`, `UseCubeStatsOptions`, `CubeStatsState` from `src/types/api.ts`
- Produces: `useCubeStats` hook

- [ ] **Step 1: Create useCubeStats hook**

```typescript
// src/hooks/useCubeStats.ts
import { useState, useEffect, useCallback } from "react";
import type { CubeStatsResponse, CubeStatsParams, UseCubeStatsOptions, CubeStatsState } from "@/types/api";

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5分

export function useCubeStats(options: UseCubeStatsOptions = {}): CubeStatsState {
  const { intervalMs = DEFAULT_INTERVAL_MS, enabled = true, params = {} } = options;

  const [data, setData] = useState<CubeStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const buildQueryString = useCallback((p: CubeStatsParams): string => {
    const sp = new URLSearchParams();
    if (p.since) sp.set("since", p.since);
    if (p.potential_type) sp.set("potential_type", p.potential_type);
    if (p.cube_type) sp.set("cube_type", p.cube_type);
    if (p.grade_transition) sp.set("grade_transition", String(p.grade_transition));
    if (p.is_miracle !== undefined) sp.set("is_miracle", String(p.is_miracle));
    return sp.toString();
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const response = await fetch(`/functions/v1/cube-stats?${queryString}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const json: CubeStatsResponse = await response.json();
      setData(json);
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, params]);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // 初回即時実行 + 定期実行
  useEffect(() => {
    if (!enabled) return;

    fetchStats();
    const interval = setInterval(fetchStats, intervalMs);
    return () => clearInterval(interval);
  }, [enabled, intervalMs, fetchStats]);

  return {
    data,
    isLoading,
    error,
    lastFetched,
    refetch,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCubeStats.ts
git commit -m "feat: add useCubeStats hook for periodic stats sync"
```

---

### Task 5: Dashboard.tsx を useCubeStats に移行

**Files:**
- Modify: `src/components/Dashboard.tsx`

**Interfaces:**
- Consumes: `useCubeStats` hook, `CubeStatsResponse` type
- Produces: Updated Dashboard component using API instead of direct Supabase

- [ ] **Step 1: Read current Dashboard.tsx to understand existing logic**

Run: `cat src/components/Dashboard.tsx | head -100`
Expected: See imports and getCubeUsageStats usage

- [ ] **Step 2: Replace SupabaseRecordRepository.getCubeUsageStats() with useCubeStats**

```typescript
// In Dashboard.tsx - replace the cubeUsageStats useEffect and related logic
import { useCubeStats } from "@/hooks/useCubeStats";
import type { CubeStatsResponse } from "@/types/api";

// Remove these:
// import { SupabaseRecordRepository } from "@/infrastructure/repository/SupabaseRecordRepository";
// const [cubeUsageStats, setCubeUsageStats] = useState<Array<...>>([]);
// useEffect(() => { const repo = new SupabaseRecordRepository(); repo.getCubeUsageStats().then(setCubeUsageStats).catch(console.error); }, []);

// Add this:
const { data: statsResponse, isLoading, error, lastFetched, refetch } = useCubeStats({
  intervalMs: 5 * 60 * 1000, // 5分
  enabled: true,
});

// Transform statsResponse.stats to the format expected by existing UI logic
const cubeUsageStats = useMemo(() => {
  if (!statsResponse?.stats) return [];
  return statsResponse.stats.map(s => ({
    potential_type: s.potential_type,
    cube_type: s.cube_type,
    grade_transition: s.grade_transition,
    isMiracle: s.is_miracle,
    total_quantity: s.total_quantity,
    count: s.count,
    supply_rate: s.supply_rate,
  }));
}, [statsResponse]);

// Use lastFetched for "最終更新" display instead of getLatestTimestamp
// Keep participantUsers calculation (uses getAll) for now
```

- [ ] **Step 3: Update "最終更新" to use `lastFetched` from hook**

```typescript
// Replace the getLatestTimestamp useEffect with:
const latestUpdate = lastFetched;
```

- [ ] **Step 4: Verify TypeScript compiles and no runtime errors**

Run: `npm run typecheck`
Expected: PASS

Run: `npm run dev` and check dashboard loads correctly
Expected: Dashboard displays stats, periodic refresh works

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: migrate Dashboard to useCubeStats hook (Edge Function API)"
```

---

### Task 6: 開発環境での動作確認・デプロイ準備

**Files:**
- Modify: `vite.config.ts` (プロキシ設定追加)
- Verify: `.env` 環境変数

**Interfaces:**
- Consumes: Vite dev server config
- Produces: Local dev proxy to Edge Function

- [ ] **Step 1: Add Vite proxy for `/functions` path**

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/functions": {
        target: "https://<your-project-ref>.supabase.co",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/functions/, "/functions/v1"),
      },
    },
  },
});
```

- [ ] **Step 2: Deploy Edge Function to Supabase**

```bash
# Supabase CLI でデプロイ
supabase functions deploy cube-stats --project-ref <your-project-ref>

# 環境変数設定
supabase secrets set SUPABASE_URL=https://<your-project-ref>.supabase.co SUPABASE_ANON_KEY=<your-anon-key> --project-ref <your-project-ref>
```

- [ ] **Step 3: Test deployed function**

```bash
curl "https://<your-project-ref>.supabase.co/functions/v1/cube-stats"
# Should return JSON with stats array and meta
```

- [ ] **Step 4: Test local dev with proxy**

Run: `npm run dev`
Expected: Dashboard loads stats from Edge Function via Vite proxy

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add Vite proxy for Edge Function local development"
```

---

### Task 7: テスト・検証

**Files:**
- Test: Manual verification checklist

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified working system

- [ ] **Step 1: Verify confidential columns are NOT in response**

```bash
curl "https://<project-ref>.supabase.co/functions/v1/cube-stats" | jq '.stats[0] | keys'
# Should NOT contain: id, character_name, server_name, part, timestamp, created_at, grade_before, grade_after
# Should contain: potential_type, cube_type, grade_transition, grade_transition_label, is_miracle, total_quantity, count, supply_rate
```

- [ ] **Step 2: Verify grade_transition_label is correct**

```bash
curl "https://<project-ref>.supabase.co/functions/v1/cube-stats" | jq '.stats[] | {grade_transition, grade_transition_label}'
# 1 -> "レア → エピック"
# 2 -> "エピック → ユニーク"
# 3 -> "ユニーク → レジェンダリー"
```

- [ ] **Step 3: Verify query parameters work**

```bash
# Filter by cube_type
curl "https://<project-ref>.supabase.co/functions/v1/cube-stats?cube_type=neo"

# Filter by is_miracle
curl "https://<project-ref>.supabase.co/functions/v1/cube-stats?is_miracle=true"

# Filter by since
curl "https://<project-ref>.supabase.co/functions/v1/cube-stats?since=2026-07-01T00:00:00+09:00"
```

- [ ] **Step 4: Verify CORS headers for external access**

```bash
curl -H "Origin: https://example.com" -I "https://<project-ref>.supabase.co/functions/v1/cube-stats"
# Should have: Access-Control-Allow-Origin: *
```

- [ ] **Step 5: Verify periodic sync in browser**

1. Open dev tools Network tab
2. Wait 5+ minutes
3. Verify `/functions/v1/cube-stats` request fires automatically
4. Verify dashboard updates without manual refresh

- [ ] **Step 6: Run existing tests**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 7: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: No errors

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete Edge Function stats API with periodic sync

- Add CubeStats API types (src/types/api.ts)
- Implement Edge Function cube-stats with aggregation logic
- Add useCubeStats hook with 5-min interval polling
- Migrate Dashboard to use API instead of direct Supabase
- Protect confidential columns (id, character_name, server_name, etc.)
- Add grade_transition_label for external API consumers
- Configure Vite proxy for local development"
```

---

## 完了基準

- [ ] Edge Function がデプロイされ、HTTPS でアクセス可能
- [ ] レスポンスに機密カラム（id, character_name, server_name, part, timestamp, created_at, grade_before, grade_after）が含まれない
- [ ] grade_transition (1-3) が grade_transition_label ("レア → エピック" 等) に変換されて返却される
- [ ] フロントエンドの Dashboard が 5分間隔で自動更新される
- [ ] 外部サイトから CORS エラーなしで API 呼び出し可能
- [ ] 既存テスト・lint・typecheck がすべてパスする