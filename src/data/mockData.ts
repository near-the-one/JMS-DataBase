import type { CubeUsageRecord, AggregatedStat } from "@/types";
import type { ServerName } from "@/types";

/* ── シード付き擬似乱数 ────────────────────────── */
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// Use a time‑based seed so data changes on each app start
const rng = createRng(Date.now());

const SERVERS_LIST: ServerName[] = ["かえで", "ゆかり", "くるみ", "チャレンジャーズ"];

function pickServer(): ServerName {
  const i = Math.floor(rng() * SERVERS_LIST.length);
  return SERVERS_LIST[i];
}

/* ── 組合せ 9 通り ───────────────────────────────── */
type ComboTriple = {
  cube_type: "neo" | "mega" | "neo_additional";
  grade_from: "rare" | "epic" | "unique" | "legendary";
  grade_to: "rare" | "epic" | "unique" | "legendary";
};

const ALL_COMBOS: ComboTriple[] = [
  { cube_type: "neo", grade_from: "rare", grade_to: "epic" },
  { cube_type: "neo", grade_from: "epic", grade_to: "unique" },
  { cube_type: "neo", grade_from: "unique", grade_to: "legendary" },
  { cube_type: "mega", grade_from: "rare", grade_to: "epic" },
  { cube_type: "mega", grade_from: "epic", grade_to: "unique" },
  { cube_type: "mega", grade_from: "unique", grade_to: "legendary" },
  { cube_type: "neo_additional", grade_from: "rare", grade_to: "epic" },
  { cube_type: "neo_additional", grade_from: "epic", grade_to: "unique" },
  { cube_type: "neo_additional", grade_from: "unique", grade_to: "legendary" },
];

/* ── レコード生成 ────────────────────────────────── */
export const MOCK_RECORDS: CubeUsageRecord[] = [];
let nextId = 1;

/** 1つのタイム区分についてレコードを生成する (isMiracle: ミラクルタイムか, datePrefix: "2026-01-01" 形式の文字列) */
function generateRecords(
  count: number,
  isMiracle: boolean,
  datePrefix: string,
) {
  const perCombo = Math.floor(count / ALL_COMBOS.length);
  const residual = count % ALL_COMBOS.length;

  let ix = 0;
  for (const combo of ALL_COMBOS) {
    const upgradeCount = randInt(rng, 10, 99);
    const perRecord = randInt(rng, 1, 9);
    const totalNeed = Math.ceil(randInt(rng, 100, 500) / perRecord);
    const upN = Math.min(upgradeCount, totalNeed);
    const n = perCombo + (ix < residual ? 1 : 0);
    const server = pickServer();

    for (let i = 0; i < n; i++) {
      const upgraded = i < upN;
      MOCK_RECORDS.push({
        id: nextId++,
        date: datePrefix,
        server_name: server,
        potential_type:
          combo.cube_type === "neo_additional"
            ? "additional_potential"
            : "potential",
        cube_type: combo.cube_type,
        grade_before: combo.grade_from,
        grade_after: upgraded ? combo.grade_to : combo.grade_from,
        quantity_used: perRecord,
        is_miracle_time: isMiracle,
      });
    }
    ix++;
  }
}

// 通常時 6000件
generateRecords(6000, false, "2026-07-01");
// ミラクルタイム 2スロット × 2000件ずつ
generateRecords(2000, true, "2025-11-01");
generateRecords(2000, true, "2026-05-02");

/* ── 集計 ───────────────────────────────────────── */
export function aggregateRecords(
  records: readonly CubeUsageRecord[],
): AggregatedStat[] {
  const map = new Map<string, AggregatedStat>();

  for (const r of records) {
    const key = `${r.cube_type}|${r.grade_before}|${r.grade_after}`;

    let entry = map.get(key);
    if (!entry) {
      entry = {
        potential_type:
          r.cube_type === "neo_additional"
            ? "additional_potential"
            : "potential",
        cube_type: r.cube_type,
        grade_from: r.grade_before,
        grade_to: r.grade_after,
        normal_count: 0,
        normal_rate: 0,
        miracle_count: 0,
        miracle_rate: 0,
      };
      map.set(key, entry);
    }

    if (r.upgraded) {
      if (r.is_miracle_time) {
        entry.miracle_count++;
      } else {
        entry.normal_count++;
      }
    }
  }

  for (const stat of map.values()) {
    const normalCubes = records
      .filter(
        (r) =>
          !r.is_miracle_time &&
          r.cube_type === stat.cube_type &&
          r.grade_before === stat.grade_from &&
          r.grade_after === stat.grade_to,
      )
      .reduce((sum, r) => sum + r.quantity_used, 0);

    stat.normal_rate =
      normalCubes > 0
        ? Math.round((stat.normal_count / normalCubes) * 1000) / 10
        : 0;

    const miracleCubes = records
      .filter(
        (r) =>
          r.is_miracle_time &&
          r.cube_type === stat.cube_type &&
          r.grade_before === stat.grade_from &&
          r.grade_after === stat.grade_to,
      )
      .reduce((sum, r) => sum + r.quantity_used, 0);

    stat.miracle_rate =
      miracleCubes > 0
        ? Math.round((stat.miracle_count / miracleCubes) * 1000) / 10
        : 0;
  }

  return Array.from(map.values());
}

export { SERVER_NAMES } from "@/types";

export const MOCK_AGGREGATED: AggregatedStat[] =
  aggregateRecords(MOCK_RECORDS);

export function totalSamples(): number {
  return MOCK_RECORDS.reduce((sum, r) => sum + r.quantity_used, 0);
}