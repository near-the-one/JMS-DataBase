import type { PotentialType, CubeType, Grade } from "@/types";
import { GRADE_LABELS, POTENTIAL_LABELS, CUBE_LABELS } from "@/types";
import { useMemo, useState } from "react";
import type { CubeStatsResponse } from "@/types/api";

type PotentialGroup = {
  potentialType: PotentialType;
  cubes: CubeType[];
};

const GROUPS: PotentialGroup[] = [
  { potentialType: "potential", cubes: ["neo", "mega"] },
  { potentialType: "additional_potential", cubes: ["neo_additional"] },
];

/** 公式が謳う「ミラクルタイムは通常時の2倍」という表示値。実測倍率との比較基準として使う。 */
const OFFICIAL_MIRACLE_MULTIPLIER = 2.0;

/** この使用個数合計を下回るデータは「サンプル数が少ない」として、数値を薄い色にし警告文を出す */
const LOW_SAMPLE_THRESHOLD = 1000;

function formatRate(rate: number | undefined): string {
  if (rate === undefined || rate === 0) return "—";
  return Number(rate).toFixed(1);
}

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
 * 問題なのは2倍を"割っている"場合のみ。バーの色分けと数値の文字色、両方でこの判定を共有する。
 */
function getRateHealth(normalRate: number, miracleRate: number): { hasBothRates: boolean; isBelowFloor: boolean } {
  const hasBothRates = normalRate > 0 && miracleRate > 0;
  return {
    hasBothRates,
    isBelowFloor: hasBothRates && miracleRate / normalRate < 2,
  };
}

/**
 * 通常時/ミラクルタイム比較バー。
 * 色は割合にかかわらず固定(通常時=緑、ミラクルタイム=オレンジ)。
 * 2倍ラインを割っているかどうかの警告は、バーではなくカード内のテキスト(a-diff)側で表示する。
 */
function CompareBar({ normalRate, miracleRate }: { normalRate: number; miracleRate: number; showLabel?: boolean }) {
  const { normalWidth, miracleWidth } = getCompareBarWidths(normalRate, miracleRate);
  return (
    <div className="prob-bar prob-bar-compare">
      <div className="prob-fill-miracle" style={{ width: `${miracleWidth}%` }}></div>
      <div className="prob-fill-normal" style={{ width: `${normalWidth}%` }}></div>
    </div>
  );
}

interface DashboardProps {
  statsResponse: CubeStatsResponse | null;
  participantUsers: number;
  isMiracleTime: boolean;
  latestUpdatedAt: string | null;
  style?: React.CSSProperties;
}

export function Dashboard({ statsResponse, participantUsers, isMiracleTime, latestUpdatedAt, style }: DashboardProps) {
  const [activeCube, setActiveCube] = useState<CubeType>("neo");

  // APIレスポンスを既存UIロジックが期待する形式に変換
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

  // Format the latest update time to yyyy/mm/dd hh:mm (JST)
  const formattedLatestUpdate = useMemo(() => {
    if (!latestUpdatedAt) return null;
  
    const date = new Date(latestUpdatedAt);
  
    if (isNaN(date.getTime())) return null;
  
    const parts = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
  
    const values = Object.fromEntries(
      parts.map(({ type, value }) => [type, value])
    );
  
    return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}`;
  }, [latestUpdatedAt]);

  const gradeMap: Record<number, [string, string]> = {
    1: ["rare", "epic"],
    2: ["epic", "unique"],
    3: ["unique", "legendary"],
  };

  type StatMapEntry = {
    potential_type: string;
    cube_type: string;
    grade_from: string;
    grade_to: string;
    normal_rate: number;
    miracle_rate: number;
    normal_count: number;
    miracle_count: number;
    normal_quantity: number;
    miracle_quantity: number;
  };

  // 通常時・ミラクルタイム両方のレートを持つ単一の statMap を作成
  const statMap = useMemo(() => {
    const map = new Map<string, StatMapEntry>();
    for (const s of cubeUsageStats) {
      const [grade_from, grade_to] = gradeMap[s.grade_transition] ?? ["", ""];
      const key = `${s.potential_type}|${s.cube_type}|${grade_from}|${grade_to}`;
      if (!map.has(key)) {
        map.set(key, {
          potential_type: s.potential_type,
          cube_type: s.cube_type,
          grade_from,
          grade_to,
          normal_rate: 0,
          miracle_rate: 0,
          normal_count: 0,
          miracle_count: 0,
          normal_quantity: 0,
          miracle_quantity: 0,
        });
      }
      const entry = map.get(key)!;
      if (s.isMiracle) {
        entry.miracle_rate = s.supply_rate;
        entry.miracle_count = s.count;
        entry.miracle_quantity = s.total_quantity;
      } else {
        entry.normal_rate = s.supply_rate;
        entry.normal_count = s.count;
        entry.normal_quantity = s.total_quantity;
      }
    }
    return map;
  }, [cubeUsageStats]);

  type ProbStat = {
    potential_type: string;
    cube_type: string;
    grade_from: string;
    grade_to: string;
    normalRate: number;
    miracleRate: number;
    normalCount: number;
    miracleCount: number;
    normalQuantity: number;
    miracleQuantity: number;
  };

  // 全キューブ分の遷移統計（タブ表示・統計サマリの両方に使う）
  const probStats = useMemo(() => {
    const stats: ProbStat[] = [];
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
            normalCount: stat?.normal_count ?? 0,
            miracleCount: stat?.miracle_count ?? 0,
            normalQuantity: stat?.normal_quantity ?? 0,
            miracleQuantity: stat?.miracle_quantity ?? 0,
          });
        }
      }
    }
    return stats;
  }, [statMap]);

  // Calculate total stats for stat-strip
  const totalSamples = cubeUsageStats.reduce((sum, s) => sum + s.total_quantity, 0);

  // 「直近ミラクルの乖離」: 公式の2倍ラインを割っている(=要注意な)遷移の件数
  const miracleDeviationCount = useMemo(
    () => probStats.filter((s) => getRateHealth(s.normalRate, s.miracleRate).isBelowFloor).length,
    [probStats],
  );

  const cubeTabs: CubeType[] = ["neo", "mega", "neo_additional"];
  const activeStats = probStats.filter((s) => s.cube_type === activeCube);

  return (
    <div data-testid="view-dashboard" style={style}>
      {/* Miracle Banner */}
      <div className="miracle-banner" style={{ display: isMiracleTime ? 'flex' : 'none' }}>
        <span className="dot"></span>
        ミラクルタイム開催中 — 昇級確率が通常の2倍になっています
      </div>

      <div className="page-head">
        <div className="eyebrow">PROBABILITY OVERVIEW</div>
        <h1>キューブごとの昇級確率</h1>
        <p>コミュニティが登録したキューブ使用データから算出したリアルタイム集計で、実際の確率とは異なります。</p>
      </div>

      {/* Cube tab switcher */}
      <div className="a-tabbar">
        {cubeTabs.map((cubeType) => (
          <button
            key={cubeType}
            type="button"
            className={`a-tab${activeCube === cubeType ? ' active' : ''}`}
            onClick={() => setActiveCube(cubeType)}
          >
            {CUBE_LABELS[cubeType]}
          </button>
        ))}
      </div>

      {/* Persistent caveat */}
      <div className="a-caveat">
        ⚠️ コミュニティ実測値です。公式確率ではありません。サンプルが少ない項目は参考程度にご覧ください。
      </div>

      {/* Cards for the selected cube */}
      <div className="a-cards">
        <div className="a-cards-head">
          <span className="cube-icon">
            <img
              src={`/assets/cube-icons/cube-${activeCube === 'neo' ? 'neo' : activeCube === 'mega' ? 'mega' : 'neo-additional'}.png`}
              alt={CUBE_LABELS[activeCube]}
            />
          </span>
          <span className="name">{CUBE_LABELS[activeCube]}</span>
          <span className="type-badge">{POTENTIAL_LABELS[activeCube === "neo_additional" ? "additional_potential" : "potential"]}</span>
        </div>

        {activeStats.map((stat) => {
          const displayRate = isMiracleTime ? stat.miracleRate : stat.normalRate;
          const sampleQuantity = stat.normalQuantity + stat.miracleQuantity;
          const isLowSample = sampleQuantity > 0 && sampleQuantity < LOW_SAMPLE_THRESHOLD;
          const { hasBothRates, isBelowFloor } = getRateHealth(stat.normalRate, stat.miracleRate);
          const measuredMultiplier = hasBothRates ? stat.miracleRate / stat.normalRate : null;
          const diffPercent = measuredMultiplier !== null
            ? ((measuredMultiplier / OFFICIAL_MIRACLE_MULTIPLIER - 1) * 100)
            : null;

          return (
            <div className="a-card" key={`${stat.grade_from}-${stat.grade_to}`}>
              <div className="a-cardhead">
                <div className="a-title">
                  {GRADE_LABELS[stat.grade_from as Grade]} <span className="arrow">→</span> <b>{GRADE_LABELS[stat.grade_to as Grade]}</b>
                </div>
                <div className={`a-n${isLowSample ? ' low' : ''}`}>
                  n = {sampleQuantity > 0 ? sampleQuantity.toLocaleString() : '—'}個
                </div>
              </div>
              <div className="a-big" style={isLowSample ? { color: 'var(--ink-soft)' } : undefined}>
                {formatRate(displayRate)}<span className="sign">%</span>
              </div>
              {isLowSample ? (
                <div className="a-sub warn">⚠ サンプル数が少なく、実際の確率と大きく異なる可能性があります</div>
              ) : (
                <div className="a-sub">
                  {isMiracleTime ? 'ミラクルタイムの実測値' : '通常時の実測値'}(合計{sampleQuantity.toLocaleString()}個の使用データより算出)
                </div>
              )}
              <CompareBar normalRate={stat.normalRate} miracleRate={stat.miracleRate} />
              {hasBothRates && measuredMultiplier !== null && diffPercent !== null && (
                <div className="a-compare">
                  <div className="a-compare-row">
                    <span className="lbl">公式が謳う倍率</span>
                    <span className="val">{OFFICIAL_MIRACLE_MULTIPLIER.toFixed(2)}倍</span>
                  </div>
                  <div className="a-compare-row">
                    <span className="lbl">実測倍率({formatRate(stat.miracleRate)}% ÷ {formatRate(stat.normalRate)}%)</span>
                    <span className="val">{measuredMultiplier.toFixed(2)}倍</span>
                  </div>
                  <div className={`a-diff${isBelowFloor ? '' : ' ok'}`}>
                    {isBelowFloor
                      ? `⚠ 公式表示を下回っています(誤差 ${diffPercent.toFixed(1)}%)`
                      : `✓ 公式表示とほぼ一致(誤差 ${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%)`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stat Strip */}
      <div className="stat-strip">
        <div className="stat-cell"><div className="label">総サンプル数</div><div className="value num">{totalSamples.toLocaleString()}</div></div>
        <div className="stat-cell"><div className="label">参加ユーザー</div><div className="value num">{participantUsers > 0 ? participantUsers.toLocaleString() : '—'}</div></div>
        <div className="stat-cell">
          <div className="label">直近ミラクルの乖離</div>
          <div className={`value num${miracleDeviationCount > 0 ? ' warn' : ''}`}>
            {miracleDeviationCount > 0 ? `要注意 ${miracleDeviationCount}件` : '問題なし'}
          </div>
        </div>
        <div className="stat-cell"><div className="label">最終更新</div><div className="value num" style={{ fontSize: '16px' }}>{formattedLatestUpdate ?? '—'}</div></div>
      </div>
    </div>
  );
}
