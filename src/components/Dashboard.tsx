import type { PotentialType, CubeType, Grade } from "@/types";
import { GRADE_LABELS, POTENTIAL_LABELS, CUBE_LABELS } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/infrastructure/supabaseClient";
import { SupabaseRecordRepository } from "@/infrastructure/repository/SupabaseRecordRepository";

type PotentialGroup = {
  potentialType: PotentialType;
  cubes: CubeType[];
};

const GROUPS: PotentialGroup[] = [
  { potentialType: "potential", cubes: ["neo", "mega"] },
  { potentialType: "additional_potential", cubes: ["neo_additional"] },
];

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

/** 良好/警告/データ不足に応じて "good" | "warn" | "" のクラス名を返す（rc-value, mv-value 共通） */
function healthClass(normalRate: number, miracleRate: number): string {
  const { hasBothRates, isBelowFloor } = getRateHealth(normalRate, miracleRate);
  if (!hasBothRates) return "";
  return isBelowFloor ? "warn" : "good";
}

/**
 * 通常時/ミラクルタイム比較バー。
 * ミラクルタイムは理論上「通常時の2倍以上」が正常(2倍を超える分にはユーザー有利なので問題ない)。
 * 問題なのは2倍を"割っている"場合のみなので、その場合だけ通常時バーを警告色にする。
 * 50%地点の点線は「2倍ライン(最低基準)」の目印。
 */
function CompareBar({ normalRate, miracleRate }: { normalRate: number; miracleRate: number; showLabel?: boolean }) {
  const { normalWidth, miracleWidth } = getCompareBarWidths(normalRate, miracleRate);
  const { isBelowFloor } = getRateHealth(normalRate, miracleRate);
  return (
    <div className="prob-bar prob-bar-compare">
      <div className="prob-fill-miracle" style={{ width: `${miracleWidth}%` }}></div>
      <div className={`prob-fill-normal${isBelowFloor ? ' warn' : ''}`} style={{ width: `${normalWidth}%` }}></div>
    </div>
  );
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
  const [participantUsers, setParticipantUsers] = useState(0);
  const [latestUpdate, setLatestUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const repo = new SupabaseRecordRepository();
    repo.getCubeUsageStats().then(setCubeUsageStats).catch(console.error);
  }, []);

  // 参加ユーザー数を計算（キャラ名ありの重複除外 + 無記名分で+1）
  useEffect(() => {
    const calculateParticipants = async () => {
      try {
        const repo = new SupabaseRecordRepository();
        const records = await repo.getAll();

        // キャラ名があるレコード（nullでないかつ空でない）から重複を除外
        const namedUsers = new Set(
          records
            .filter(r => r.character_name !== null && r.character_name !== '')
            .map(r => r.character_name!)
        );

        // 無記名レコードがあるかどうかをチェック
        const hasUnnamed = records.some(r => r.character_name === null || r.character_name === '');

        // 参加ユーザー数 = 名前があるユニークユーザー数 + (無記名レコードがある場合は+1)
        const count = namedUsers.size + (hasUnnamed ? 1 : 0);
        setParticipantUsers(count);
      } catch (error) {
        console.error('Failed to calculate participant users:', error);
        setParticipantUsers(0);
      }
    };

    calculateParticipants();
  }, []);

  // Fetch latest update timestamp from DB
  useEffect(() => {
    const repo = new SupabaseRecordRepository();
    repo.getLatestTimestamp()
      .then(ts => setLatestUpdate(new Date(ts)))
      .catch(err => console.error('Failed to fetch latest timestamp', err));
  }, []);

  // Fetch miracle time schedules and check if currently in miracle time
  useEffect(() => {
    const fetchSchedules = async () => {
      const { data, error } = await supabase.from("miracle_time_schedules").select("start,end");
      if (error || !data) {
        console.error('Failed to load miracle schedules', error);
        return;
      }
      const schedules = (data || []) as Array<{ start: string; end: string }>;

      // miracle_time_schedules の start/end は JST で格納されているので、JSTとして解釈して比較
      const toJST = (v: string) => {
        if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(v)) return v;
        const iso = v.replace(' ', 'T');
        return iso.includes('T') ? `${iso}+09:00` : `${iso}T00:00:00+09:00`;
      };
      const now = new Date();
      const nowJST = new Date(now.getTime() + 9 * 60 * 60 * 1000); // Convert to JST
      const isMiracle = schedules.some(s => {
        const start = new Date(toJST(s.start)).getTime();
        const end = new Date(toJST(s.end)).getTime();
        return nowJST.getTime() >= start && nowJST.getTime() <= end;
      });
      setIsMiracleTime(isMiracle);
    };
    fetchSchedules();
  }, []);

  const gradeMap: Record<number, [string, string]> = {
    1: ["rare", "epic"],
    2: ["epic", "unique"],
    3: ["unique", "legendary"],
  };
  // 通常時・ミラクルタイム両方のレートを持つ単一の statMap を作成
  const statMap = useMemo(() => {
    const map = new Map<string, any>();
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
        });
      }
      const entry = map.get(key)!;
      if (s.isMiracle) {
        entry.miracle_rate = s.supply_rate;
        entry.miracle_count = s.count;
      } else {
        entry.normal_rate = s.supply_rate;
        entry.normal_count = s.count;
      }
    }
    return map;
  }, [cubeUsageStats]);

  // prob-grid transition stats
  const probStats = useMemo(() => {
    const stats: any[] = [];
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
          });
        }
      }
    }
    return stats;
  }, [statMap])

  // Calculate total stats for stat-strip
  const totalSamples = cubeUsageStats.reduce((sum, s) => sum + s.total_quantity, 0);
  // 対応キューブ種は型定義に基づく固定値（データの有無に関わり）
  const cubeTypesUsed = Object.keys(CUBE_LABELS).length;

  return (
    <>
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

      {/* Prob Grid - 3 cards showing primary transition for each cube type */}
      <div className="prob-grid">
        {/* 3 cards per cube type, grouped by cube */}
        {(["neo", "mega", "neo_additional"] as CubeType[]).map((cubeType) => {
          const stats = probStats.filter((s: any) => s.cube_type === cubeType);
          return (
            <div key={cubeType} className="prob-card">
              <div className="prob-card-head">
                <span className="cube-icon">
                  <img
                    src={`/assets/cube-icons/cube-${cubeType === 'neo' ? 'neo' : cubeType === 'mega' ? 'mega' : 'neo-additional'}.png`}
                    alt={CUBE_LABELS[cubeType]}
                  />
                </span>
                <span className="name">{CUBE_LABELS[cubeType]}</span>
                <span className="type-badge">{POTENTIAL_LABELS[cubeType === "neo_additional" ? "additional_potential" : "potential"]}</span>
              </div>
              <div className="prob-rows">
                {stats.map((stat, index) => (
                  index === 0 ? (
                    <div key="top" className="prob-row top">
                      <div className="grade-flow">
                        {GRADE_LABELS[stat.grade_from as Grade]} <span className="arrow">→</span> <b>{GRADE_LABELS[stat.grade_to as Grade]}</b>
                      </div>
                      <div className="prob-big">{formatRate(isMiracleTime ? stat.miracleRate : stat.normalRate)}<span className="sign">%</span></div>
                      <CompareBar normalRate={stat.normalRate} miracleRate={stat.miracleRate} showLabel />
                      <div className="rate-compare">
                        <div className="rc-values">
                          <div className="rc-item"><span className="rc-label">通常時</span><span className={`rc-value ${healthClass(stat.normalRate, stat.miracleRate)}`}>{formatRate(stat.normalRate)}%</span></div>
                          <div className="rc-item mt-col">
                            <span className="rc-label">ミラクルタイム</span><span className="rc-value hi">{formatRate(stat.miracleRate)}%</span><br />
                            {(stat.normalRate > 0 && stat.miracleRate > 0) && (
                              <span className={`rc-multi ${healthClass(stat.normalRate, stat.miracleRate)}`}>
                                実測 <span className="num">{(stat.miracleRate / stat.normalRate).toFixed(2)}倍</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={index} className="prob-row sub">
                      <div className="grade-flow">
                        {GRADE_LABELS[stat.grade_from as Grade]} <span className="arrow">→</span> <b>{GRADE_LABELS[stat.grade_to as Grade]}</b>
                      </div>
                      <div className="mini-compare">
                        <div className="mv-item"><span className="mv-label">通常時</span><span className={`mv-value ${healthClass(stat.normalRate, stat.miracleRate)}`}>{formatRate(stat.normalRate)}%</span></div>
                        <div className="mv-item"><span className="mv-label">ミラクル</span><span className="mv-value hi">{formatRate(stat.miracleRate)}%</span></div>
                        {(stat.normalRate > 0 && stat.miracleRate > 0) && (
                          <span className={`mv-multi ${healthClass(stat.normalRate, stat.miracleRate)}`}>
                            {(stat.miracleRate / stat.normalRate).toFixed(2)}倍
                          </span>
                        )}
                      </div>
                      <CompareBar normalRate={stat.normalRate} miracleRate={stat.miracleRate} />
                    </div>
                  )
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stat Strip */}
      <div className="stat-strip">
        <div className="stat-cell"><div className="label">総サンプル数</div><div className="value num">{totalSamples.toLocaleString()}</div></div>
        <div className="stat-cell"><div className="label">対応キューブ種</div><div className="value num">{cubeTypesUsed}</div></div>
        <div className="stat-cell"><div className="label">参加ユーザー</div><div className="value num">{participantUsers > 0 ? participantUsers.toLocaleString() : '—'}</div></div>
        <div className="stat-cell"><div className="label">最終更新</div><div className="value num" style={{ fontSize: '16px' }}>{latestUpdate ? latestUpdate.toLocaleString() : '—'}</div></div>
      </div>
    </>
  );
}