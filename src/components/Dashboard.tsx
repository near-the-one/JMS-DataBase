import type { CSSProperties } from "react";
import type { PotentialType, CubeType, Grade } from "@/types";
import type { CubeStatsResponse } from "@/types/api";
import { GRADE_LABELS, POTENTIAL_LABELS, CUBE_LABELS } from "@/types";
import { useMemo, useState } from "react";

type PotentialGroup = {
  potentialType: PotentialType;
  cubes: CubeType[];
};

const GROUPS: PotentialGroup[] = [
  { potentialType: "potential", cubes: ["neo", "mega"] },
  { potentialType: "additional_potential", cubes: ["neo_additional"] },
];

const CUBE_TABS: CubeType[] = ["neo", "mega", "neo_additional"];

/** 等級ごとの色分け（レア=青 / エピック=紫 / ユニーク=黄 / レジェンダリー=緑） */
const GRADE_COLOR_CLASS: Record<Grade, string> = {
  rare: "grade-rare",
  epic: "grade-epic",
  unique: "grade-unique",
  legendary: "grade-legendary",
};

/** 等級の略記号（バッジに表示する1文字） */
const GRADE_LETTER: Record<Grade, string> = {
  rare: "R",
  epic: "E",
  unique: "U",
  legendary: "L",
};

function GradeLabel({ grade }: { grade: Grade }) {
  return (
    <span className={`grade-chip ${GRADE_COLOR_CLASS[grade]}`}>
      <span className="grade-chip-letter">{GRADE_LETTER[grade]}</span>
      {GRADE_LABELS[grade]}
    </span>
  );
}

function formatRate(rate: number | undefined): string {
  if (rate === undefined || rate === 0) return "—";
  return Number(rate).toFixed(1);
}

/** サンプル数(総攻撃回数)がこれ未満の場合は、判定を保留して警告メッセージのみ表示する */
const LOW_SAMPLE_THRESHOLD = 100;

/** 通常時/ミラクルタイムの2値を、大きい方がバー端(100%)に届くようスケーリングした幅(%)を返す */
function getCompareBarWidths(normalRate: number, miracleRate: number): { normalWidth: number; miracleWidth: number } {
  const maxRate = Math.max(normalRate, miracleRate, 0.01); // 0除算防止
  const scale = 100 / maxRate;
  return {
    normalWidth: normalRate * scale,
    miracleWidth: miracleRate * scale,
  };
}

/**
 * ミラクルタイムは理論上「通常時の2倍以上」が正常(2倍を超える分にはユーザー有利なので問題ない)。
 * 問題なのは2倍を"割っている"場合のみ。
 */
function getRateHealth(normalRate: number, miracleRate: number): { hasBothRates: boolean; isBelowFloor: boolean } {
  const hasBothRates = normalRate > 0 && miracleRate > 0;
  return {
    hasBothRates,
    isBelowFloor: hasBothRates && miracleRate / normalRate < 2,
  };
}

type TransitionStat = {
  potential_type: PotentialType;
  cube_type: CubeType;
  grade_from: Grade;
  grade_to: Grade;
  normalRate: number;
  miracleRate: number;
  normalQuantity: number;
  miracleQuantity: number;
};

/**
 * 1つの等級遷移カード（Option Aデザイン）。
 * 通常時/ミラクルタイムを別々のトラックに分け、ミラクルタイム側に「公式:2倍位置」の基準線を引く。
 * サンプル数が少なすぎる場合は判定を保留し、警告メッセージのみ表示する。
 */
function TransitionCard({ stat }: { stat: TransitionStat }) {
  const { normalRate, miracleRate, normalQuantity, miracleQuantity } = stat;
  const totalSamples = normalQuantity + miracleQuantity;
  const isLowSample = totalSamples < LOW_SAMPLE_THRESHOLD;
  const { hasBothRates, isBelowFloor } = getRateHealth(normalRate, miracleRate);
  const { normalWidth, miracleWidth } = getCompareBarWidths(normalRate, miracleRate);
  // 「公式:2倍位置」の基準線 = 通常時バーの2倍の位置(同じスケール上)。100%を超える場合はクランプする。
  const refLinePosition = Math.min(normalWidth * 2, 100);
  const multiplier = hasBothRates ? miracleRate / normalRate : null;

  return (
    <div className="cube-card">
      <div className="cube-grade">
        <div className="cube-grade-title">
          <GradeLabel grade={stat.grade_from} /> <span className="arrow">→</span> <GradeLabel grade={stat.grade_to} />
        </div>
        <div className={`cube-n-badge${isLowSample ? " low" : ""}`}>n={totalSamples.toLocaleString()}個</div>
      </div>

      {isLowSample ? (
        <div className="cube-lowsample">
          ⚠ サンプル数が少なく、実際の確率と大きく異なる可能性があります。データが増えるまで倍率の判定は保留しています。
        </div>
      ) : (
        <>
          <div className="cube-row">
            <div className="cube-toplabel"><span>通常時</span><b>{formatRate(normalRate)}%</b></div>
            <div className="cube-track">
              <div className="cube-fill normal" style={{ width: `${normalWidth}%` }}></div>
            </div>
          </div>
          <div className="cube-row" style={{ marginTop: 16 }}>
            <div className="cube-toplabel cube-toplabel-with-ref"><span>ミラクルタイム(実測)</span><b>{formatRate(miracleRate)}%</b></div>
            <div className="cube-track">
              <div className="cube-fill miracle" style={{ width: `${miracleWidth}%` }}></div>
              <div className={`cube-refline${isBelowFloor ? " warn" : ""}`} style={{ left: `${refLinePosition}%` }}></div>
              <div
                className={`cube-reflabel${refLinePosition > 85 ? " edge-right" : refLinePosition < 15 ? " edge-left" : ""}`}
                style={{ left: `${refLinePosition}%` }}
              >
                公式:2倍位置
              </div>
            </div>
          </div>

          {multiplier !== null && (
            <div className={`cube-verdict ${isBelowFloor ? "bad" : "ok"}`}>
              {isBelowFloor ? "⚠" : "✓"} 実測{multiplier.toFixed(2)}倍 — 公式の2倍に{isBelowFloor ? "届いていない" : "対して十分"}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export interface DashboardProps {
  statsResponse: CubeStatsResponse | null;
  participantUsers: number;
  isMiracleTime: boolean;
  latestUpdatedAt: string | null;
  style?: CSSProperties;
}

const GRADE_TRANSITION_MAP: Record<number, [Grade, Grade]> = {
  1: ["rare", "epic"],
  2: ["epic", "unique"],
  3: ["unique", "legendary"],
};

export function Dashboard({ statsResponse, participantUsers, isMiracleTime, latestUpdatedAt, style }: DashboardProps) {
  const [selectedCubeType, setSelectedCubeType] = useState<CubeType>("neo");

  const rawStats = statsResponse?.stats ?? [];

  // 通常時・ミラクルタイム両方のレート & サンプル数(total_quantity)を持つ単一の statMap を作成
  const statMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of rawStats) {
      const [grade_from, grade_to] = GRADE_TRANSITION_MAP[s.grade_transition] ?? ["rare", "epic"];
      const key = `${s.potential_type}|${s.cube_type}|${grade_from}|${grade_to}`;
      if (!map.has(key)) {
        map.set(key, {
          potential_type: s.potential_type,
          cube_type: s.cube_type,
          grade_from,
          grade_to,
          normal_rate: 0,
          miracle_rate: 0,
          normal_quantity: 0,
          miracle_quantity: 0,
        });
      }
      const entry = map.get(key)!;
      if (s.is_miracle) {
        entry.miracle_rate = s.supply_rate;
        entry.miracle_quantity = s.total_quantity;
      } else {
        entry.normal_rate = s.supply_rate;
        entry.normal_quantity = s.total_quantity;
      }
    }
    return map;
  }, [rawStats]);

  // 全キューブ種 x 全等級遷移のフラットなリスト
  const allTransitionStats: TransitionStat[] = useMemo(() => {
    const stats: TransitionStat[] = [];
    for (const group of GROUPS) {
      for (const cubeType of group.cubes) {
        const fixedTransitions: [Grade, Grade][] = [
          ["unique", "legendary"],
          ["epic", "unique"],
          ["rare", "epic"],
        ];
        for (const [fromGrade, toGrade] of fixedTransitions) {
          const key = `${group.potentialType}|${cubeType}|${fromGrade}|${toGrade}`;
          const stat = statMap.get(key);
          stats.push({
            potential_type: group.potentialType,
            cube_type: cubeType,
            grade_from: fromGrade,
            grade_to: toGrade,
            normalRate: stat?.normal_rate ?? 0,
            miracleRate: stat?.miracle_rate ?? 0,
            normalQuantity: stat?.normal_quantity ?? 0,
            miracleQuantity: stat?.miracle_quantity ?? 0,
          });
        }
      }
    }
    return stats;
  }, [statMap]);

  // 選択中のキューブ種のカードのみ表示
  const visibleStats = useMemo(
    () => allTransitionStats.filter((s) => s.cube_type === selectedCubeType),
    [allTransitionStats, selectedCubeType],
  );

  // Calculate total stats for stat-strip
  const totalSamples = useMemo(
    () => rawStats.reduce((sum, s) => sum + s.total_quantity, 0),
    [rawStats],
  );

  // 「2倍未達のキューブ」件数: サンプル数が十分あるのに実測倍率が2倍を下回っている遷移の数
  const belowFloorCount = useMemo(() => {
    return allTransitionStats.filter((s) => {
      const totalSamplesForStat = s.normalQuantity + s.miracleQuantity;
      if (totalSamplesForStat < LOW_SAMPLE_THRESHOLD) return false;
      const { hasBothRates, isBelowFloor } = getRateHealth(s.normalRate, s.miracleRate);
      return hasBothRates && isBelowFloor;
    }).length;
  }, [allTransitionStats]);

  const potentialTypeForTab = (cubeType: CubeType): PotentialType =>
    cubeType === "neo_additional" ? "additional_potential" : "potential";

  const latestUpdateDate = latestUpdatedAt ? new Date(latestUpdatedAt) : null;

  return (
    <div style={style}>
      {/* Miracle Banner */}
      <div className="miracle-banner" style={{ display: isMiracleTime ? 'flex' : 'none' }}>
        <span className="dot"></span>
        ミラクルタイム開催中 — 昇級確率が通常の2倍になっています
      </div>

      <div className="page-head">
        <div className="eyebrow">PROBABILITY OVERVIEW</div>
        <h1>種類ごとの昇級確率</h1>
        <p>コミュニティが登録したキューブ使用データから算出したリアルタイム集計です。</p>
      </div>

      {/* キューブ種タブ */}
      <div className="cube-tabbar">
        {CUBE_TABS.map((cubeType) => (
          <button
            key={cubeType}
            type="button"
            className={`cube-tab${selectedCubeType === cubeType ? " active" : ""}`}
            onClick={() => setSelectedCubeType(cubeType)}
          >
            {CUBE_LABELS[cubeType]}
          </button>
        ))}
      </div>

      <div className="cube-caveat">
        ⚠️ コミュニティ実測値です。公式確率ではありません。
      </div>

      <div className="cube-card-head-strip">
        <span className="cube-icon">
          <img
            src={`/assets/cube-icons/cube-${selectedCubeType === 'neo' ? 'neo' : selectedCubeType === 'mega' ? 'mega' : 'neo-additional'}.png`}
            alt={CUBE_LABELS[selectedCubeType]}
          />
        </span>
        <span className="name">{CUBE_LABELS[selectedCubeType]}</span>
        <span className="type-badge">{POTENTIAL_LABELS[potentialTypeForTab(selectedCubeType)]}</span>
      </div>

      {/* 選択中のキューブ種の等級遷移カード(3件) */}
      <div className="cube-card-list">
        {visibleStats.map((stat) => (
          <TransitionCard key={`${stat.grade_from}-${stat.grade_to}`} stat={stat} />
        ))}
      </div>

      {/* Stat Strip */}
      <div className="stat-strip">
        <div className="stat-cell"><div className="label">総サンプル数</div><div className="value num">{totalSamples.toLocaleString()}</div></div>
        <div className="stat-cell"><div className="label">参加ユーザー</div><div className="value num">{participantUsers > 0 ? participantUsers.toLocaleString() : '—'}</div></div>
        <div className="stat-cell"><div className="label">2倍未達のキューブ</div><div className={`value num${belowFloorCount > 0 ? " warn" : ""}`}>{belowFloorCount}件</div></div>
        <div className="stat-cell"><div className="label">最終更新</div><div className="value num" style={{ fontSize: '16px' }}>{latestUpdateDate ? latestUpdateDate.toLocaleString() : '—'}</div></div>
      </div>
    </div>
  );
}
