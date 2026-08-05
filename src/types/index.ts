/** 潜在能力の種類 */
export type PotentialType = "potential" | "additional_potential";

/** キューブの種類 */
export type CubeType = "neo" | "mega" | "neo_additional";

/** 等級 */
export type Grade = "rare" | "epic" | "unique" | "legendary";

/** 等級の昇級順（低→高） */
export const GRADE_ORDER: readonly Grade[] = [
  "rare",
  "epic",
  "unique",
  "legendary",
] as const;

/** 等級の表示名 */
export const GRADE_LABELS: Record<Grade, string> = {
  rare: "レア",
  epic: "エピック",
  unique: "ユニーク",
  legendary: "レジェンダリー",
};

/** 潜在能力の表示名 */
export const POTENTIAL_LABELS: Record<PotentialType, string> = {
  potential: "潜在能力",
  additional_potential: "アディショナル潜在能力",
};

/** キューブ種類の表示名 */
export const CUBE_LABELS: Record<CubeType, string> = {
  neo: "ネオキューブ",
  mega: "メガキューブ",
  neo_additional: "ネオアディショナルキューブ",
};

/** 稼働率のタイミング区分 */
export type TimingType = "normal" | "miracle_time";

/** サーバー名 */
export type ServerName = "かえで" | "ゆかり" | "くるみ" | "チャレンジャーズ";

/** サーバー選択肢一覧 */
export const SERVER_NAMES: ServerName[] = [
  "かえで",
  "ゆかり",
  "くるみ",
  "チャレンジャーズ",
] as const;

/** モックデータの1行（実際のSupabaseテーブルを模擬した構造） */
export interface CubeUsageRecord {
  /** 連番プライマリーキー */
  id: number | string;
  /** 日付 (YYYY-MM-DD) */
  date: string;
  /** サーバー名 */
  server_name: ServerName;
  /** 潜在能力タイプ */
  potential_type: PotentialType;
  /** 使用キューブ種類 */
  cube_type: CubeType;
  /** 昇級前の等級 */
  grade_before: Grade;
  /** 昇級後の等級 */
  grade_after: Grade;
  /** 使用個数 */
  quantity_used: number;
  /** 昇級成功したか */
  upgraded: boolean;
  /** ミラクルタイムか */
  is_miracle_time: boolean;
}

/** 集計結果の1セル（特定の combination の集計値） */
export interface AggregatedStat {
  /** 潜在能力タイプ */
  potential_type: PotentialType;
  /** キューブ種類 */
  cube_type: CubeType;
  /** どの等級→どの等級への遷移か */
  grade_from: Grade;
  grade_to: Grade;
  /** 通常時: 使用個数合計 */
  normal_count: number;
  /** 通常時: 昇級率（%） */
  normal_rate: number;
  /** ミラクルタイム時: 使用個数合計 */
  miracle_count: number;
  /** ミラクルタイム時: 昇級率（%） */
  miracle_rate: number;
}

/** CubeUsageRecord を拡張した手入力用レコード */
export interface ManualEntryRecord {
  id: number;
  server_name: ServerName | null;
  potential_type: PotentialType;
  cube_type: CubeType;
  grade_before: Grade;
  /** 昇級後の等級。result==="success" のときのみ意味を持つ（"fail" の場合は null） */
  grade_after?: Grade | null;
  quantity_used: number;
  character_name: string | null;
  timestamp: number;
  /** 登録時刻（自動生成） */
  created_at: number;
  part?: string;
  result: "success" | "fail";
}