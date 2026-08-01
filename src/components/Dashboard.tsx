import type { AggregatedStat, PotentialType, CubeType, Grade } from "@/types";
import { GRADE_LABELS, POTENTIAL_LABELS, CUBE_LABELS } from "@/types";
import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/supabaseClient";
import { SupabaseRecordRepository } from "@/infrastructure/repository/SupabaseRecordRepository";

const GRADE_COLORS: Record<Grade, string> = {
  rare: "#0000ff",
  epic: "#800080",
  unique: "#ffd700",
  legendary: "#008000",
};

const CUBE_SWATCH_COLORS: Record<CubeType, string> = {
  neo: "#FF8A3D",
  mega: "#E24F00",
  neo_additional: "#FFC48A",
};

const CUBE_SWATCH_CLASSES: Record<CubeType, string> = {
  neo: "sw-neo",
  mega: "sw-mega",
  neo_additional: "sw-add",
};

// Map each cube type to its PRIMARY transition for the prob-grid
// Reference design: ネオキューブ=エピック→ユニーク, メガキューブ=ユニーク→レジェンダリー, ネオアディショナル=レア→エピック
const PRIMARY_TRANSITIONS: Record<CubeType, [Grade, Grade]> = {
  neo: ["epic", "unique"],
  mega: ["unique", "legendary"],
  neo_additional: ["rare", "epic"],
};

type PotentialGroup = {
  potentialType: PotentialType;
  cubes: CubeType[];
};

const GROUPS: PotentialGroup[] = [
  { potentialType: "potential", cubes: ["neo", "mega"] },
  { potentialType: "additional_potential", cubes: ["neo_additional"] },
];

export interface MiracleEvent {
  id: string;
  date: string;
  description: string;
  label: string;
}

export const MIRACLE_EVENTS: MiracleEvent[] = [];

export const useMiracleEvents = () => {
  const [events, setEvents] = useState<MiracleEvent[]>([]);
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.from("miracle_time_schedules").select("*");
      if (error || !data) {
        console.error('Failed to load miracle schedules', error);
        setEvents([{ id: "normal", date: "", description: "通常時", label: "通常時" }]);
        return;
      }
      const fetched: MiracleEvent[] = data.map((row: any) => {
        const dateObj = new Date(row.start);
        const formatted = dateObj.toLocaleDateString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\//g, '/');
        return {
          id: row.id,
          date: formatted,
          description: row.label,
          label: `${formatted} ${row.label}`,
        };
      });
      setEvents([{ id: "normal", date: "", description: "通常時", label: "通常時" }, ...fetched]);
    };
    fetch();
  }, []);
  return events;
};

function buildStatMap(stats: AggregatedStat[]): Map<string, AggregatedStat> {
  const map = new Map<string, AggregatedStat>();
  for (const s of stats) {
    map.set(`${s.potential_type}|${s.cube_type}|${s.grade_from}|${s.grade_to}`, s);
  }
  return map;
}

function getStat(
  statMap: Map<string, AggregatedStat>,
  potentialType: PotentialType,
  cubeType: CubeType,
  from: Grade,
  to: Grade,
): AggregatedStat | undefined {
  return statMap.get(`${potentialType}|${cubeType}|${from}|${to}`);
}

function formatRate(rate: number | undefined): string {
  if (rate === undefined || rate === 0) return "—";
  return Number(rate).toFixed(1);
}

export function Dashboard() {
  const [cubeUsageStats, setCubeUsageStats] = useState<Array<{
    potential_type: string;
    cube_type: string;
    grade_transition: number;
    isMiracle: boolean;
    total_quantity: number;
    count: number;
    supply_rate: number;
  }>>([]);

  const [isMiracleTime, setIsMiracleTime] = useState(false);

  useEffect(() => {
    const repo = new SupabaseRecordRepository();
    repo.getCubeUsageStats().then(setCubeUsageStats).catch(console.error);
  }, []);

  const gradeMap: Record<number, [string, string]> = {
    1: ["rare", "epic"],
    2: ["epic", "unique"],
    3: ["unique", "legendary"],
  };
  const aggregated = cubeUsageStats.map((s) => {
    const [grade_from, grade_to] = gradeMap[s.grade_transition] ?? ["", ""];
    const normal_rate = s.isMiracle ? 0 : s.supply_rate;
    const miracle_rate = s.isMiracle ? s.supply_rate : 0;
    return {
      potential_type: s.potential_type,
      cube_type: s.cube_type,
      grade_from,
      grade_to,
      normal_rate,
      miracle_rate,
    } as any;
  });
  const statMap = buildStatMap(aggregated);

  // Calculate total stats for stat-strip
  const totalSamples = cubeUsageStats.reduce((sum, s) => sum + s.count, 0);
  const cubeTypesUsed = new Set(cubeUsageStats.map(s => s.cube_type)).size;

  return (
    <div className="container theme-bg">
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

      {/* Prob Grid - 3 cards showing primary transition for each cube type */}
      <div className="prob-grid">
        {GROUPS.flatMap((group) =>
          group.cubes.map((cubeType) => {
            const [fromGrade, toGrade] = PRIMARY_TRANSITIONS[cubeType];
            const stat = getStat(statMap, group.potentialType, cubeType, fromGrade, toGrade);
            const normalRate = stat?.normal_rate ?? 0;
            const miracleRate = stat?.miracle_rate ?? 0;
            const displayRate = isMiracleTime ? miracleRate : normalRate;
            const sampleCount = stat?.count ?? 0;
            const barWidth = Math.min(displayRate * 10, 100); // Scale for visual

            return (
              <div key={cubeType} className="prob-card">
                <div className="prob-card-head">
                  <span className={`cube-swatch ${CUBE_SWATCH_CLASSES[cubeType]}`}></span>
                  <span className="name">{CUBE_LABELS[cubeType]}</span>
                  <span className="type-badge">{POTENTIAL_LABELS[group.potentialType]}</span>
                </div>
                <div className="grade-flow">
                  {GRADE_LABELS[fromGrade]} <span className="arrow">→</span> <b>{GRADE_LABELS[toGrade]}</b>
                </div>
                <div className="prob-big">{formatRate(displayRate)}<span className="sign">%</span></div>
                <div className="prob-sub">サンプル数 {sampleCount.toLocaleString()}件</div>
                <div className="prob-bar"><div className="prob-fill" style={{ width: `${barWidth}%` }}></div></div>
              </div>
            );
          })
        )}
      </div>

      {/* Stat Strip */}
      <div className="stat-strip">
        <div className="stat-cell"><div className="label">総サンプル数</div><div className="value num">{totalSamples.toLocaleString()}</div></div>
        <div className="stat-cell"><div className="label">対応キューブ種</div><div className="value num">{cubeTypesUsed}</div></div>
        <div className="stat-cell"><div className="label">参加ユーザー</div><div className="value num">—</div></div>
        <div className="stat-cell"><div className="label">最終更新</div><div className="value num" style={{ fontSize: '16px' }}>—</div></div>
      </div>
    </div>
  );
}