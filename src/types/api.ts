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
    latest_created_at: string;
    cache_hint: {
      max_age: number;
      stale_while_revalidate: number;
    };
  };
  // 追加フィールド
  participant_users: number;
  is_miracle_time: boolean;
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
  // 追加: 参加ユーザー数、ミラクルタイム判定
  participantUsers: number;
  isMiracleTime: boolean;
}