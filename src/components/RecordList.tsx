import { useState, useMemo } from "react";
import type { ManualEntryRecord, PotentialType, ServerName } from "@/types";
import { POTENTIAL_LABELS, CUBE_LABELS, GRADE_LABELS } from "@/types";
import { useFilters, FilterValues } from "@/hooks/useFilters";

interface RecordListProps {
  records: ManualEntryRecord[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

type SortKey =
  | "server_name"
  | "potential_type"
  | "cube_type"
  | "grade_transition"
  | "quantity_used"
  | "character_name"
  | "timestamp"
  | "part";

const SERVER_OPTIONS = [
  { value: "", label: "全サーバー" },
  { value: "Chaos", label: "Chaos" },
  { value: "Bera", label: "Bera" },
  { value: "Reboot", label: "Reboot" },
  { value: "Scania", label: "Scania" },
  { value: "El Nido", label: "El Nido" },
  { value: "GMS", label: "GMS" },
];

const POTENTIAL_OPTIONS = [
  { value: "", label: "全種別" },
  { value: "potential", label: "潜在能力" },
  { value: "additional_potential", label: "アディショナル潜在能力" },
];

const GRADE_OPTIONS = [
  { value: "", label: "全等級" },
  { value: "rare-epic", label: "レア → エピック" },
  { value: "epic-unique", label: "エピック → ユニーク" },
  { value: "unique-legendary", label: "ユニーク → レジェンダリー" },
];

export function RecordList({ records, onEdit, onDelete }: RecordListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [asc, setAsc] = useState(false); // default descending for timestamp
  const { filters, applyFilters, setAll } = useFilters();

  const computeTransition = (rec: ManualEntryRecord): number | string => {
    if (rec.grade_before === "rare" && rec.grade_after === "epic") return 1;
    if (rec.grade_before === "epic" && rec.grade_after === "unique") return 2;
    if (rec.grade_before === "unique" && rec.grade_after === "legendary") return 3;
    return ""; // no valid transition
  };

  const computeTransitionLabel = (rec: ManualEntryRecord): string => {
    return `${GRADE_LABELS[rec.grade_before]} → ${GRADE_LABELS[rec.grade_after]}`;
  };

  const compare = (a: ManualEntryRecord, b: ManualEntryRecord) => {
    let aVal: any;
    let bVal: any;
    if (sortKey === "grade_transition") {
      aVal = computeTransition(a);
      bVal = computeTransition(b);
    } else {
      aVal = (a as any)[sortKey];
      bVal = (b as any)[sortKey];
    }
    // normalize booleans
    if (typeof aVal === "boolean") aVal = aVal ? 1 : 0;
    if (typeof bVal === "boolean") bVal = bVal ? 1 : 0;
    if (aVal < bVal) return asc ? -1 : 1;
    if (aVal > bVal) return asc ? 1 : -1;
    return 0;
  };

  const filteredRecords = useMemo(() => applyFilters(records), [records, applyFilters]);
  const sorted = useMemo(() => [...filteredRecords].sort(compare), [filteredRecords, sortKey, asc]);

  const header = (label: string, key: SortKey) => (
    <th>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span onClick={() => toggleSort(key)} style={{ cursor: "pointer" }}>
          {label}{sortKey === key ? (asc ? " ▲" : " ▼") : ""}
        </span>
      </div>
    </th>
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setAsc(!asc);
    } else {
      setSortKey(key);
      setAsc(true);
    }
  };

  const handleFilterChange = (newFilters: FilterValues) => {
    setAll(newFilters);
  };

  if (records.length === 0) {
    return (
      <>
        <div className="page-head">
          <div className="eyebrow">SUBMITTED RECORDS</div>
          <h1>登録一覧</h1>
          <p>登録されたキューブ使用データの一覧です。条件を絞り込んで確認できます。</p>
        </div>
        <div className="filter-panel">
          <div className="f-group">
            <label htmlFor="filter-potential-type">種別</label>
            <select id="filter-potential-type" value={filters.potential_type} onChange={(e) => handleFilterChange({ ...filters, potential_type: e.target.value as PotentialType | 'all' })}>
              {POTENTIAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="f-group">
            <label htmlFor="filter-server-name">サーバー</label>
            <select id="filter-server-name" value={filters.server_name} onChange={(e) => handleFilterChange({ ...filters, server_name: e.target.value as ServerName | 'all' })}>
              {SERVER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="f-group">
            <label htmlFor="filter-grade-transition">等級（開始）</label>
            <select id="filter-grade-transition" value={filters.grade_transition} onChange={(e) => handleFilterChange({ ...filters, grade_transition: e.target.value })}>
              {GRADE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="f-group">
            <label htmlFor="filter-min-quantity">使用個数 ≥</label>
            <input id="filter-min-quantity" type="number" placeholder="0" value={filters.min_quantity ?? ""} onChange={(e) => handleFilterChange({ ...filters, min_quantity: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="f-group">
            <label htmlFor="filter-date-from">登録日 ≥</label>
            <input id="filter-date-from" type="date" value={filters.date_from ?? ""} onChange={(e) => handleFilterChange({ ...filters, date_from: e.target.value })} />
          </div>
        </div>
        <p>データがありません</p>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">SUBMITTED RECORDS</div>
        <h1>登録一覧</h1>
        <p>登録されたキューブ使用データの一覧です。条件を絞り込んで確認できます。</p>
      </div>

      <div className="filter-panel">
        <div className="f-group">
          <label htmlFor="filter-potential-type">種別</label>
          <select id="filter-potential-type" value={filters.potential_type} onChange={(e) => handleFilterChange({ ...filters, potential_type: e.target.value as PotentialType | 'all' })}>
            {POTENTIAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="f-group">
          <label htmlFor="filter-server-name">サーバー</label>
          <select id="filter-server-name" value={filters.server_name} onChange={(e) => handleFilterChange({ ...filters, server_name: e.target.value as ServerName | 'all' })}>
            {SERVER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="f-group">
          <label htmlFor="filter-grade-transition">等級（開始）</label>
          <select id="filter-grade-transition" value={filters.grade_transition} onChange={(e) => handleFilterChange({ ...filters, grade_transition: e.target.value })}>
            {GRADE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="f-group">
          <label htmlFor="filter-min-quantity">使用個数 ≥</label>
          <input id="filter-min-quantity" type="number" placeholder="0" value={filters.min_quantity ?? ""} onChange={(e) => handleFilterChange({ ...filters, min_quantity: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div className="f-group">
          <label htmlFor="filter-date-from">登録日 ≥</label>
          <input id="filter-date-from" type="date" value={filters.date_from ?? ""} onChange={(e) => handleFilterChange({ ...filters, date_from: e.target.value })} />
        </div>
      </div>

      <div className="table-wrap" data-testid="record-list">
        <table>
          <thead>
            <tr>
              {header("キャラクター名", "character_name")}
              {header("サーバー名", "server_name")}
              {header("種別", "potential_type")}
              {header("キューブ種類", "cube_type")}
              {header("部位", "part")}
              {header("等級遷移", "grade_transition")}
              {header("使用個数", "quantity_used")}
              {header("登録日時", "timestamp")}
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((record) => (
              <tr key={record.id} data-testid={`record-row-${record.id}`}>
                <td>{record.character_name ?? ""}</td>
                <td>{record.server_name ?? ""}</td>
                <td>
                  <span className={`badge ${record.potential_type === "potential" ? "type-pot" : ""}`}>
                    {POTENTIAL_LABELS[record.potential_type]}
                  </span>
                </td>
                <td>
                  <span className="cube-tag">
                    <span className={`cube-swatch ${record.cube_type === "neo" ? "sw-neo" : record.cube_type === "mega" ? "sw-mega" : "sw-add"}`}></span>
                    {CUBE_LABELS[record.cube_type]}
                  </span>
                </td>
                <td>{record.part ?? ""}</td>
                <td>{computeTransitionLabel(record)}</td>
                <td className="qty">{record.quantity_used}</td>
                <td>{new Date(record.timestamp).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="row-actions">
                  <button onClick={() => onEdit(record.id)}>編集</button>
                  <button onClick={() => onDelete(record.id)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}