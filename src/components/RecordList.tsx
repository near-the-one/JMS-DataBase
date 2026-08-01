import { useState } from "react";
// Filter icon omitted to avoid external dependency
import type { ManualEntryRecord } from "@/types";
import { GRADE_LABELS, POTENTIAL_LABELS, CUBE_LABELS } from "@/types";

interface RecordListProps {
  records: ManualEntryRecord[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  filters: any;
  openFilter: () => void;
}

type SortKey =
  | "server_name"
  | "potential_type"
  | "cube_type"
  | "grade_transition"
  | "quantity_used"
  | "character_name"
  | "timestamp";

export function RecordList({ records, onEdit, onDelete, filters, openFilter }: RecordListProps) {
  if (records.length === 0) {
    return (
      <div data-testid="record-list">
        データがありません
      </div>
    );
  }

  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [asc, setAsc] = useState(false); // default descending for timestamp

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setAsc(!asc);
    } else {
      setSortKey(key);
      setAsc(true);
    }
  };

  const computeTransition = (rec: ManualEntryRecord): number | string => {
    if (rec.grade_before === "rare" && rec.grade_after === "epic") return 1;
    if (rec.grade_before === "epic" && rec.grade_after === "unique") return 2;
    if (rec.grade_before === "unique" && rec.grade_after === "legendary") return 3;
    return ""; // no valid transition
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

  const sorted = [...records].sort(compare);
  const displayed = sorted; // show all rows

  const header = (label: string, key: SortKey) => (
    <th style={{ cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span onClick={() => toggleSort(key)}>
          {label}{sortKey === key ? (asc ? " ▲" : " ▼") : ""}
        </span>
        <button
          aria-label={`filter-${key}`}
          onClick={(e) => { e.stopPropagation(); openFilter(); }}
          style={{ background: "transparent", border: "none", marginLeft: "4px", cursor: "pointer" }}
        >
          🔍
        </button>
      </div>
    </th>
  );

  return (
    <div data-testid="record-list" style={{ maxHeight: "500px", overflowY: "auto" }}>
      <table>
        <thead>
          <tr>
            {header("サーバー", "server_name")}
            {header("種別", "potential_type")}
            {header("キューブ種類", "cube_type")}
            {header("等級遷移", "grade_transition")}
            {header("登録日時", "timestamp")}
            {header("使用個数", "quantity_used")}
            {header("キャラクター名", "character_name")}
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((record) => (
            <tr key={record.id} data-testid={`record-row-${record.id}`}>
              <td>{record.server_name}</td>
              <td>{POTENTIAL_LABELS[record.potential_type]}</td>
              <td>{CUBE_LABELS[record.cube_type]}</td>
              <td>{computeTransition(record)}</td>
              <td>{record.timestamp}</td>
              <td>{record.quantity_used}</td>
              <td>{record.character_name ?? ""}</td>
              <td>
                <button onClick={() => onEdit(record.id)}>編集</button>
                <button onClick={() => onDelete(record.id)}>削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
