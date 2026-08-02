// supabase/functions/cube-stats/_shared/datetime.ts
// timestamp カラムは tz なしの `timestamp` 型で、JSTの値をそのまま(オフセット無しで)保存する設計。
// epoch(ms) から JST の生の日時文字列を作る。
export function toJstNaiveTimestamp(epochMs: number): string {
  const d = new Date(epochMs + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// DBの timestamp (JSTのnaive文字列 or 既にオフセット付き) を epoch(ms) に変換する。
export function fromJstNaiveTimestamp(value: string): number {
  const hasOffset = /[Zz]|[+-]\d{2}:?\d{2}$/.test(value);
  const iso = hasOffset ? value : `${value.replace(" ", "T")}+09:00`;
  return new Date(iso).getTime();
}