// src/hooks/useCubeStats.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import type { CubeStatsResponse, CubeStatsParams, UseCubeStatsOptions, CubeStatsState } from "@/types/api";

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5分
const EMPTY_PARAMS: CubeStatsParams = {}; // 定数として定義

export function useCubeStats(options: UseCubeStatsOptions = {}): CubeStatsState {
  const { intervalMs = DEFAULT_INTERVAL_MS, enabled = true, params = EMPTY_PARAMS } = options;

  const [data, setData] = useState<CubeStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // params をメモ化（参照安定化）
  const memoizedParams = useMemo(() => params, [params]);

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
      const queryString = buildQueryString(memoizedParams);
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
  }, [buildQueryString, memoizedParams]);

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
    // 追加: APIレスポンスから直接取得
    participantUsers: data?.participant_users ?? 0,
    isMiracleTime: data?.is_miracle_time ?? false,
  };
}