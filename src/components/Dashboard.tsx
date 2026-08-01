import type { AggregatedStat, PotentialType, CubeType, Grade, ServerName, ManualEntryRecord } from "@/types";
import { GRADE_LABELS, POTENTIAL_LABELS, CUBE_LABELS } from "@/types";
// // import { aggregateRecords } from "@/data/mockData"; // Replaced with live stats // Replaced with live stats
import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/supabaseClient";
import { SupabaseRecordRepository } from "@/infrastructure/repository/SupabaseRecordRepository";
import "./Dashboard.module.css";

// Placeholder aggregateRecords to avoid undefined error when using live stats
const aggregateRecords = (records: any) => [] as any;

const GRADE_COLORS: Record<Grade, string> = {
  rare: "#0000ff",
  epic: "#800080",
  unique: "#ffd700",
  legendary: "#008000",
};

const CUBE_ICONS: Record<CubeType, string> = {
  neo: "/assets/cube-icons/cube-neo.png",
  mega: "/assets/cube-icons/cube-mega.png",
  neo_additional: "/assets/cube-icons/cube-neo-additional.png",
};

const TRANSITIONS: [Grade, Grade][] = [
  ["unique", "legendary"],
  ["epic", "unique"],
  ["rare", "epic"],
];

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
  date: string; // e.g. "2025/11/1"
  description: string; // e.g. "全体" or "部位別[頭]"
  label: string; // display string for UI
}

export const MIRACLE_EVENTS: MiracleEvent[] = [];

// Hook to load miracle schedule data from Supabase
export const useMiracleEvents = () => {
  const [events, setEvents] = useState<MiracleEvent[]>([]);
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.from("miracle_time_schedules").select("*");
      if (error) {
        console.error('Failed to load miracle schedules', error);
        setEvents([
          { id: "normal", date: "", description: "通常時", label: "通常時" },
        ]);
        return;
      }
      const fetched: MiracleEvent[] = data.map((row: any) => {
        const dateObj = new Date(row.start);
        // Format as YYYY/MM/DD in JST (Asia/Tokyo)
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
      setEvents([
        { id: "normal", date: "", description: "通常時", label: "通常時" },
        ...fetched,
      ]);
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

interface DashboardProps { records: ManualEntryRecord[]; }
export function Dashboard({ records }: DashboardProps) {
  const [cubeUsageStats, setCubeUsageStats] = useState<Array<{
    potential_type: string;
    cube_type: string;
    grade_transition: number;
    isMiracle: boolean;
    total_quantity: number;
    count: number;
    supply_rate: number;
  }>>([]);

  // Load cube usage statistics from Supabase
  useEffect(() => {
    const repo = new SupabaseRecordRepository();
    repo.getCubeUsageStats().then(setCubeUsageStats).catch(console.error);
  }, []);

  // Build aggregated stats from live cube usage data
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

  return (<>
    <div className="container theme-bg">
      {GROUPS.map((group) => (
        <section key={group.potentialType} aria-labelledby={`section-${group.potentialType}`} className="card">
          <h2 id={`section-${group.potentialType}`}>{POTENTIAL_LABELS[group.potentialType]}</h2>
          {group.cubes.map((cubeType) => (
            <div key={cubeType}>
              <h3>
                <img
                  src={CUBE_ICONS[cubeType]}
                  alt=""
                  style={{ width: 24, height: 24, verticalAlign: "middle", marginRight: 6 }}
                />
                {CUBE_LABELS[cubeType]}
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>等級遷移</th>
                    <th>通常</th>
                    <th>ミラクル</th>
                  </tr>
                </thead>
                <tbody>
                  {TRANSITIONS.map(([from, to]) => {
                    const stat = getStat(statMap, group.potentialType, cubeType, from, to);
                    const normalRate = stat?.normal_rate ?? 0;
                    const miracleRate = stat?.miracle_rate ?? 0;
                    return (
                      <tr key={`${cubeType}-${from}-${to}`}>
                        <td>
                          <span style={{ color: GRADE_COLORS[from] }}>{GRADE_LABELS[from]}</span>
                          {" → "}
                          <span style={{ color: GRADE_COLORS[to] }}>{GRADE_LABELS[to]}</span>
                        </td>
                        <td>{Number(normalRate).toFixed(1)}%</td>
                        <td>{Number(miracleRate).toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </div>
      </>);
}
