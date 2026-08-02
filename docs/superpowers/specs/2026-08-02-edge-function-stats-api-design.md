# Edge Function Stats API 設計書

## 概要
フロントエンドが直接 Supabase にクエリを投げるのをやめ、Supabase Edge Function 経由で統計データを取得するようにする。定期的な同期（5〜10分間隔）でフロントエンドのキャッシュを更新する。

## 目的
1. **機密データ保護**: `id`、`character_name`、サーバー名等の個人情報・識別情報を含むカラムを不特定多数のアクセスから保護する
2. **外部公開API**: 外部サイト・サービスから集計結果を簡単に取得できるパブリックAPIエンドポイントを提供する

## アーキテクチャ

```
┌─────────────────┐     HTTP/JSON      ┌──────────────────────┐     Internal      ┌─────────────┐
│   Frontend      │ ◄─────────────────► │  Edge Function       │ ◄──────────────►  │  Supabase   │
│   (React)       │   /api/stats       │  (Deno/TypeScript)   │   PostgREST       │  Database   │
└─────────────────┘                    └──────────────────────┘                   └─────────────┘
        ▲                                        ▲
        │                                        │
        │     Periodic Sync (5-10 min)           │
        │     useEffect + setInterval            │
        └────────────────────────────────────────┘
```

## Edge Function 仕様

### エンドポイント
```
GET /functions/v1/cube-stats
```

### クエリパラメータ
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `since` | ISO8601 datetime | No | 24時間前 | この日時以降のデータのみ集計 |
| `potential_type` | `potential` \| `additional_potential` | No | 全て | 潜在能力タイプで絞り込み |
| `cube_type` | `neo` \| `mega` \| `neo_additional` | No | 全て | キューブ種類で絞り込み |
| `grade_transition` | `1` \| `2` \| `3` | No | 全て | 昇級遷移で絞り込み (1=rare→epic, 2=epic→unique, 3=unique→legendary) |
| `is_miracle` | `true` \| `false` | No | 全て | ミラクルタイム判定で絞り込み |

### レスポンス形式
```typescript
interface CubeStatsResponse {
  // 集計データ（機密情報を含まない）
  stats: Array<{
    potential_type: "potential" | "additional_potential";
    cube_type: "neo" | "mega" | "neo_additional";
    grade_transition: 1 | 2 | 3;
    grade_transition_label: string;  // 例: "レア → エピック", "エピック → ユニーク", "ユニーク → レジェンダリー"
    is_miracle: boolean;
    total_quantity: number;
    count: number;
    supply_rate: number;  // 昇級率 (%)
  }>;
  
  // メタデータ
  meta: {
    generated_at: string;           // ISO8601 (JST)
    data_period_start: string;      // ISO8601 (JST) - 実際に集計した最古のレコード日時
    data_period_end: string;        // ISO8601 (JST) - 実際に集計した最新のレコード日時
    total_records: number;          // 集計対象レコード数
    cache_hint: {
      max_age: number;              // 推奨キャッシュ秒数 (300-600)
      stale_while_revalidate: number; // 古いデータを表示しつつ再検証する秒数
    };
  };
}
```

### 返却しないデータ（機密情報保護）
以下のカラムはレスポンスに**一切含めない**：
- `id` (レコード識別子)
- `character_name` (キャラクター名)
- `server_name` (サーバー名)
- `part` (装備部位)
- `timestamp` (個別レコードの使用日時)
- `created_at` (登録日時)
- `grade_before` / `grade_after` (個別の昇級前後等級) ※DBには存在せず、`grade_transition` (1=rare→epic, 2=epic→unique, 3=unique→legendary) で管理

### エラーレスポンス
```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}
```

| HTTP Status | Code | 説明 |
|-------------|------|------|
| 200 | - | 成功 |
| 400 | `INVALID_PARAMETER` | クエリパラメータ不正 |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー |
| 503 | `UNAVAILABLE` | DB接続失敗等 |

### 実装ロジック
1. `cube_usage_events` テーブルから**必要なカラムのみ**取得（`SELECT potential_type, cube_type, grade_transition, quantity_used, timestamp` のみ、機密情報を除外）
2. `miracle_time_schedules` を取得し、各レコードの timestamp がミラクルタイム内か判定
3. `(potential_type, cube_type, grade_transition, is_miracle)` でグルーピング
3. 各グループで `total_quantity` (使用個数合計), `count` (レコード数), `supply_rate = count / total_quantity * 100` を計算
4. メタデータ付きで返却（個別レコード・機密情報は一切含めない）

### 権限・アクセス制御
- **フロントエンド用**: 匿名アクセス許可（anon key 相当）、RLS ポリシー「Allow anonymous read」で制御
- **外部公開用**: 同じエンドポイントをパブリックAPIとして公開、CORS ヘッダーで全オリジン許可 (`Access-Control-Allow-Origin: *`)
- サービスロールキーは使用しない（フロントエンド・外部から直接呼ぶため）
- RLS は SELECT のみ許可、INSERT/UPDATE/DELETE は別の認証済みエンドポイントで処理

## 外部公開API 仕様

### ベースURL
```
https://<project-ref>.supabase.co/functions/v1/cube-stats
```

### 利用例
```bash
# 全統計取得
curl "https://<project-ref>.supabase.co/functions/v1/cube-stats"

# 特定キューブのみ
curl "https://<project-ref>.supabase.co/functions/v1/cube-stats?cube_type=neo"

# ミラクルタイムのみ、直近7日間
curl "https://<project-ref>.supabase.co/functions/v1/cube-stats?is_miracle=true&since=2026-07-26T00:00:00+09:00"
```

### レスポンス例
```json
{
  "stats": [
    {
      "potential_type": "potential",
      "cube_type": "neo",
      "grade_transition": 3,
      "grade_transition_label": "ユニーク → レジェンダリー",
      "is_miracle": false,
      "total_quantity": 15000,
      "count": 450,
      "supply_rate": 3.0
    },
    {
      "potential_type": "potential",
      "cube_type": "neo",
      "grade_transition": 3,
      "grade_transition_label": "ユニーク → レジェンダリー",
      "is_miracle": true,
      "total_quantity": 5000,
      "count": 280,
      "supply_rate": 5.6
    }
  ],
  "meta": {
    "generated_at": "2026-08-02T15:30:00+09:00",
    "data_period_start": "2026-07-01T00:00:00+09:00",
    "data_period_end": "2026-08-02T12:00:00+09:00",
    "total_records": 12500,
    "cache_hint": {
      "max_age": 300,
      "stale_while_revalidate": 600
    }
  }
}
```

### エラーレスポンス
```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}
```

| HTTP Status | Code | 説明 |
|-------------|------|------|
| 200 | - | 成功 |
| 400 | `INVALID_PARAMETER` | クエリパラメータ不正 |
| 429 | `RATE_LIMITED` | レート制限超過（将来的な実装） |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー |
| 503 | `UNAVAILABLE` | DB接続失敗等 |

## フロントエンド統合

### 新規フック: `useCubeStats`
```typescript
// src/hooks/useCubeStats.ts
interface UseCubeStatsOptions {
  intervalMs?: number;        // 同期間隔 (デフォルト: 5分 = 300000)
  enabled?: boolean;          // 自動同期の有効/無効
  params?: CubeStatsParams;   // クエリパラメータ
}

interface CubeStatsState {
  data: CubeStatsResponse | null;
  isLoading: boolean;
  error: Error | null;
  lastFetched: Date | null;
  refetch: () => Promise<void>;
}

function useCubeStats(options?: UseCubeStatsOptions): CubeStatsState;
```

### 既存コードへの影響
- `Dashboard.tsx`: `SupabaseRecordRepository.getCubeUsageStats()` を直接呼んでいる箇所を `useCubeStats` に置き換え
- `Dashboard.tsx`: 参加ユーザー数計算(`getAll`)と最終更新日時(`getLatestTimestamp`)は別途検討（今回は統計のみ同期対象）

### 同期ロジック
```typescript
// useCubeStats 内部実装イメージ
useEffect(() => {
  if (!enabled) return;
  
  const fetch = async () => {
    setIsLoading(true);
    try {
      // 相対パスで呼び出し（Viteプロキシまたは本番では同一オリジン）
      const response = await fetch(`/functions/v1/cube-stats?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const json = await response.json();
      setData(json);
      setLastFetched(new Date());
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  };
  
  fetch(); // 初回即時実行
  const interval = setInterval(fetch, intervalMs);
  return () => clearInterval(interval);
}, [enabled, intervalMs, params]);
```

### 型定義追加
```typescript
// src/types/api.ts (新規作成)
export interface CubeStatsResponse {
  stats: Array<{
    potential_type: "potential" | "additional_potential";
    cube_type: "neo" | "mega" | "neo_additional";
    grade_transition: 1 | 2 | 3;
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

export interface CubeStatsParams {
  since?: string;
  potential_type?: "potential" | "additional_potential";
  cube_type?: "neo" | "mega" | "neo_additional";
  grade_transition?: 1 | 2 | 3;
  is_miracle?: boolean;
}
```

## Edge Function 実装詳細

### ファイル配置
```
supabase/
└── functions/
    └── cube-stats/
        ├── index.ts          # エントリーポイント
        ├── _shared/
        │   ├── cors.ts       # CORS ヘッダー共通処理
        │   ├── supabase.ts   # Supabase クライアント作成
        │   └── datetime.ts   # JST naive timestamp 変換
        └── deno.json         # 依存関係
```

### 主要関数
```typescript
// supabase/functions/cube-stats/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./_shared/cors.ts";
import { fromJstNaiveTimestamp, toJstNaiveTimestamp } from "./_shared/datetime.ts";

// パラメータ検証
function validateParams(searchParams: URLSearchParams) {
  const since = searchParams.get("since");
  const potential_type = searchParams.get("potential_type");
  const cube_type = searchParams.get("cube_type");
  const grade_transition = searchParams.get("grade_transition");
  const is_miracle = searchParams.get("is_miracle");

  // バリデーション
  if (potential_type && !["potential", "additional_potential"].includes(potential_type)) {
    throw { status: 400, code: "INVALID_PARAMETER", error: "Invalid potential_type" };
  }
  if (cube_type && !["neo", "mega", "neo_additional"].includes(cube_type)) {
    throw { status: 400, code: "INVALID_PARAMETER", error: "Invalid cube_type" };
  }
  if (grade_transition && !["1", "2", "3"].includes(grade_transition)) {
    throw { status: 400, code: "INVALID_PARAMETER", error: "Invalid grade_transition" };
  }
  if (is_miracle && !["true", "false"].includes(is_miracle)) {
    throw { status: 400, code: "INVALID_PARAMETER", error: "Invalid is_miracle" };
  }
  if (since && isNaN(Date.parse(since))) {
    throw { status: 400, code: "INVALID_PARAMETER", error: "Invalid since format" };
  }

  return {
    since: since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000), // デフォルト24時間前
    potential_type: potential_type as "potential" | "additional_potential" | undefined,
    cube_type: cube_type as "neo" | "mega" | "neo_additional" | undefined,
    grade_transition: grade_transition ? parseInt(grade_transition, 10) as 1 | 2 | 3 : undefined,
    is_miracle: is_miracle === "true" ? true : is_miracle === "false" ? false : undefined,
  };
}

// メイン集計ロジック
async function aggregateStats(supabase: any, params: ReturnType<typeof validateParams>) {
  // 1. 必要なカラムのみ取得（機密情報を除外）
  // grade_before/grade_after はDBに存在せず、grade_transition (1-3) で管理
  let query = supabase
    .from("cube_usage_events")
    .select("potential_type, cube_type, grade_transition, quantity_used, timestamp");

  // パラメータでフィルタ
  if (params.potential_type) query = query.eq("potential_type", params.potential_type);
  if (params.cube_type) query = query.eq("cube_type", params.cube_type);
  if (params.grade_transition) query = query.eq("grade_transition", params.grade_transition);
  // since は timestamp でフィルタ（JST naive 文字列比較）
  if (params.since) {
    const sinceStr = toJstNaiveTimestamp(params.since.getTime());
    query = query.gte("timestamp", sinceStr);
  }

  const { data: events, error: evErr } = await query;
  if (evErr) throw { status: 500, code: "INTERNAL_ERROR", error: evErr.message };

  // 2. ミラクルタイムスケジュール取得
  const { data: schedules, error: schErr } = await supabase
    .from("miracle_time_schedules")
    .select("start,end");
  if (schErr) throw { status: 500, code: "INTERNAL_ERROR", error: schErr.message };

  // 3. ミラクルタイム判定ヘルパー
  const isInMiracle = (ts: string | null) => {
    if (!ts) return false;
    const time = fromJstNaiveTimestamp(ts);
    return (schedules || []).some((s: any) => {
      const start = fromJstNaiveTimestamp(s.start);
      const end = fromJstNaiveTimestamp(s.end);
      return time >= start && time <= end;
    });
  };

  // 4. グルーピング & 集計
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
    // is_miracle フィルタ
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

    // データ期間計算用
    const ts = fromJstNaiveTimestamp(r.timestamp);
    if (dataPeriodStart === null || ts < dataPeriodStart) dataPeriodStart = ts;
    if (dataPeriodEnd === null || ts > dataPeriodEnd) dataPeriodEnd = ts;
  }

  // 5. 結果整形
  const GRADE_TRANSITION_LABELS: Record<number, string> = {
    1: "レア → エピック",
    2: "エピック → ユニーク",
    3: "ユニーク → レジェンダリー",
  };

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

  // ソート（potential_type -> cube_type -> grade_transition -> is_miracle）
  stats.sort((a, b) => {
    if (a.potential_type !== b.potential_type) return a.potential_type.localeCompare(b.potential_type);
    if (a.cube_type !== b.cube_type) return a.cube_type.localeCompare(b.cube_type);
    if (a.grade_transition !== b.grade_transition) return a.grade_transition - b.grade_transition;
    return a.is_miracle === b.is_miracle ? 0 : a.is_miracle ? 1 : -1;
  });

  const now = new Date();
  return {
    stats,
    meta: {
      generated_at: now.toISOString().replace("Z", "+09:00").replace(/\.\d+/, ""), // JST ISO8601
      data_period_start: dataPeriodStart ? new Date(dataPeriodStart).toISOString().replace("Z", "+09:00").replace(/\.\d+/, "") : now.toISOString().replace("Z", "+09:00").replace(/\.\d+/, ""),
      data_period_end: dataPeriodEnd ? new Date(dataPeriodEnd).toISOString().replace("Z", "+09:00").replace(/\.\d+/, "") : now.toISOString().replace("Z", "+09:00").replace(/\.\d+/, ""),
      total_records: totalRecords,
      cache_hint: {
        max_age: 300,      // 5分
        stale_while_revalidate: 600, // 10分
      },
    },
  };
}

serve(async (req) => {
  // CORS preflight - 全オリジン許可（外部公開APIのため）
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // パラメータ検証
    const url = new URL(req.url);
    const params = validateParams(url.searchParams);

    // Supabase クライアント（anon key 使用）
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // データ取得・集計
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

### 共通ユーティリティ

```typescript
// supabase/functions/cube-stats/_shared/cors.ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // 外部公開APIのため全オリジン許可
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400", // 24時間
};
```

```typescript
// supabase/functions/cube-stats/_shared/datetime.ts
// timestamp カラムは tz なしの `timestamp` 型で、JSTの値をそのまま(オフセット無しで)保存する設計。
// epoch(ms) から JST の生の日時文字列を作る。
export function toJstNaiveTimestamp(epochMs: number): string {
  const d = new Date(epochMs + 9 * 60 * 60 * 1000); // JSTの数字を取り出すためのシフト
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

```json
// supabase/functions/cube-stats/deno.json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
    "std/": "https://deno.land/std@0.224.0/"
  }
}
```

### 環境変数
| 変数名 | 説明 | 設定場所 |
|--------|------|----------|
| `SUPABASE_URL` | プロジェクトURL | Supabase Dashboard > Settings > API |
| `SUPABASE_ANON_KEY` | anon public key | 同上 |

## デプロイ手順
```bash
# 1. 関数をデプロイ
supabase functions deploy cube-stats --project-ref <ref>

# 2. 環境変数設定（ダッシュボードまたはCLI）
supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... --project-ref <ref>

# 3. 動作確認
curl "https://<project-ref>.supabase.co/functions/v1/cube-stats"
```

## 今後の拡張余地
- `ETag` / `If-None-Match` 対応で 304 Not Modified を返す
- `Cache-Control` ヘッダーで CDN キャッシュ制御
- WebSocket / Server-Sent Events でリアルタイムプッシュ
- 統計以外のエンドポイント追加（レコードCRUD、スケジュール管理等）

## リスクと対策
| リスク | 対策 |
|--------|------|
| Edge Function のコールドスタート遅延 | 最小限の依存関係、ウォームアップ用 cron 設定 |
| 同時接続数超過 | 統計取得は読み取り専用で軽量、CDN キャッシュ併用 |
| パラメータ無しで全件取得される | デフォルトで直近24時間に制限、最大取得件数上限設定 |
| JST naive timestamp の扱いミス | 共通ユーティリティ関数で一元管理、テストで検証 |