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

// ─── 簡易レート制限（IP単位・1分間に30リクエスト） ───
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX) return false;
    entry.count++;
    return true;
  }
  rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  return true;
}

// ─── インメモリキャッシュ（30秒） ───
const CACHE_TTL_MS = 30_000;
let statsCache: {
  key: string;
  data: any;
  expiresAt: number;
} | null = null;

function getCacheKey(params: Params): string {
  return `${params.since?.toISOString()}|${params.potential_type}|${params.cube_type}|${params.grade_transition}|${params.is_miracle}`;
}

function getCachedStats(key: string): any | null {
  if (statsCache && statsCache.key === key && Date.now() < statsCache.expiresAt) {
    return statsCache.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  statsCache = { key, data, expiresAt: Date.now() + CACHE_TTL_MS };
}

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

  // デフォルト since: 指定なしなら 30日前（JST基準）
  let defaultSince: Date | undefined;
  if (since) {
    defaultSince = new Date(since);
  } else {
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    jstNow.setUTCHours(0, 0, 0, 0);
    defaultSince = new Date(jstNow.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return {
    since: defaultSince,
    potential_type: potential_type as Params["potential_type"],
    cube_type: cube_type as Params["cube_type"],
    grade_transition: grade_transition ? parseInt(grade_transition, 10) as 1 | 2 | 3 : undefined,
    is_miracle: is_miracle === "true" ? true : is_miracle === "false" ? false : undefined,
  };
}

async function getParticipantUsers(supabase: any): Promise<number> {
  const { data: records, error } = await supabase
    .from("cube_usage_events")
    .select("character_name");

  if (error) throw { status: 500, code: "INTERNAL_ERROR", error: error.message };

  const namedUsers = new Set<string>();
  let hasUnnamed = false;

  for (const r of records || []) {
    if (r.character_name && r.character_name !== '') {
      namedUsers.add(r.character_name);
    } else {
      hasUnnamed = true;
    }
  }

  return namedUsers.size + (hasUnnamed ? 1 : 0);
}

async function isCurrentlyMiracleTime(supabase: any): Promise<boolean> {
  const { data: schedules, error } = await supabase
    .from("miracle_time_schedules")
    .select("start,end");

  if (error) throw { status: 500, code: "INTERNAL_ERROR", error: error.message };

  const now = new Date();
  const nowJst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  return (schedules || []).some((s: any) => {
    const start = fromJstNaiveTimestamp(s.start);
    const end = fromJstNaiveTimestamp(s.end);
    return nowJst.getTime() >= start && nowJst.getTime() <= end;
  });
}

async function aggregateStats(supabase: any, params: Params) {
  let query = supabase
    .from("cube_usage_events")
    .select("potential_type, cube_type, grade_transition, quantity_used, timestamp, created_at");

  if (params.potential_type) query = query.eq("potential_type", params.potential_type);
  if (params.cube_type) query = query.eq("cube_type", params.cube_type);
  if (params.grade_transition) query = query.eq("grade_transition", params.grade_transition);
  if (params.since) {
    const sinceStr = toJstNaiveTimestamp(params.since.getTime());
    query = query.gte("timestamp", sinceStr);
  }

  const { data: events, error: evErr } = await query;
  if (evErr) throw { status: 500, code: "INTERNAL_ERROR", error: evErr.message };

  const { data: schedules, error: schErr } = await supabase
    .from("miracle_time_schedules")
    .select("start,end");
  if (schErr) throw { status: 500, code: "INTERNAL_ERROR", error: schErr.message };

  const isInMiracle = (ts: string | null) => {
    if (!ts) return false;
    const time = fromJstNaiveTimestamp(ts);
    return (schedules || []).some((s: any) => {
      const start = fromJstNaiveTimestamp(s.start);
      const end = fromJstNaiveTimestamp(s.end);
      return time >= start && time <= end;
    });
  };

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
  let latestCreatedAt: number | null = null;

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

    const createdAt = Number(r.created_at) || 0;
    if (latestCreatedAt === null || createdAt > latestCreatedAt) latestCreatedAt = createdAt;
  }

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
      latest_created_at: latestCreatedAt ? toJstISO(new Date(latestCreatedAt)) : toJstISO(now),
      cache_hint: { max_age: 300, stale_while_revalidate: 600 },
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 30 requests per minute." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  try {
    const url = new URL(req.url);
    const params = validateParams(url.searchParams);

    const cacheKey = getCacheKey(params);
    const cached = getCachedStats(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
        status: 200,
      });
    }

    // Use service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [aggregateResult, participantUsers, isMiracleTime] = await Promise.all([
      aggregateStats(supabase, params),
      getParticipantUsers(supabase),
      isCurrentlyMiracleTime(supabase),
    ]);

    const responseData = {
      ...aggregateResult,
      participant_users: participantUsers,
      is_miracle_time: isMiracleTime,
    };

    setCache(cacheKey, responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
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