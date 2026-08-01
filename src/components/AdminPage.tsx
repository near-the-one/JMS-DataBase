import { useState, useCallback, useEffect } from "react";
import { AdminLogin } from "@/components/AdminLogin";
import { RecordList } from "@/components/RecordList";
import { useFilters } from "@/hooks/useFilters";
import { FilterDialog } from "@/components/FilterDialog";
import { MOCK_RECORDS } from "@/data/mockData";
import { useMiracleEvents, MiracleEvent } from "@/components/Dashboard";
import type { ManualEntryRecord } from "@/types";
import { supabase } from "@/infrastructure/supabaseClient";
import type { Session, AuthChangeEvent } from "@supabase/auth-js";

const typedSupabase = supabase as any;

interface AdminPageProps {
  records?: ManualEntryRecord[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function AdminPage({
  records: externalRecords,
  onEdit: externalOnEdit,
  onDelete: externalOnDelete,
}: AdminPageProps = {}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [internalRecords, setInternalRecords] = useState<ManualEntryRecord[]>(MOCK_RECORDS as unknown as ManualEntryRecord[]);
  const loadedMiracleEvents = useMiracleEvents();
  const [miracleEvents, setMiracleEvents] = useState<MiracleEvent[]>([]);
  useEffect(() => {
    setMiracleEvents(loadedMiracleEvents);
  }, [loadedMiracleEvents]);
  const [editEvent, setEditEvent] = useState<{id:string, date:string, description:string} | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [descInput, setDescInput] = useState("");
  // filter state and dialog
  const { filters, setAll, applyFilters } = useFilters();
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const openFilter = () => setFilterDialogOpen(true);

  const useExternal = externalRecords && externalRecords.length > 0;
  const records = useExternal ? externalRecords! : internalRecords;

  const handleEdit = useCallback(
    (id: number) => {
      if (externalOnEdit) {
        externalOnEdit(id);
      }
    },
    [externalOnEdit]
  );

  const handleDelete = useCallback(
    (id: number) => {
      if (externalOnDelete) {
        externalOnDelete(id);
      } else {
        setInternalRecords((prev) => prev.filter((r) => r.id !== id));
      }
    },
    [externalOnDelete]
  );

  const addOrUpdateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput || !descInput) return;
    const label = `${dateInput} ${descInput}`;
    if (editEvent) {
      setMiracleEvents((prev) =>
        prev.map((ev) => (ev.id === editEvent.id ? { ...ev, date: dateInput, description: descInput, label } : ev))
      );
      setEditEvent(null);
    } else {
      const newEv = {
        id: Date.now().toString(),
        date: dateInput,
        description: descInput,
        label,
      };
      setMiracleEvents((prev) => [...prev, newEv]);
    }
    setDateInput("");
    setDescInput("");
  };

  const deleteMiracle = (id: string) => {
    setMiracleEvents((prev) => prev.filter((ev) => ev.id !== id));
    if (editEvent?.id === id) setEditEvent(null);
  };

  const startEdit = (ev: {id:string, date:string, description:string}) => {
    setEditEvent(ev);
    setDateInput(ev.date);
    setDescInput(ev.description);
  };

  // Check session on mount and listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = typedSupabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      setLoading(false);
    });

    // Initial session check
    typedSupabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await typedSupabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (!session) {
    return <AdminLogin onLoginSuccess={() => {}} />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>管理者画面</h2>
        <button onClick={handleLogout} style={{ padding: "0.25rem 0.5rem" }}>ログアウト</button>
      </div>
      <RecordList
        records={applyFilters(records)}
        filters={filters}
        onEdit={handleEdit}
        onDelete={handleDelete}
        openFilter={openFilter}
      />
      <FilterDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        onApply={(vals) => { setAll(vals); setFilterDialogOpen(false); }}
        initial={filters}
      />
      <div style={{ marginTop: "1rem" }}>
        <h3>ミラクルタイム開催情報</h3>
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>内容</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {miracleEvents.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.date}</td>
                <td>{ev.description}</td>
                <td>
                  <button onClick={() => startEdit(ev)}>編集</button>
                  <button onClick={() => deleteMiracle(ev.id)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addOrUpdateEvent} style={{ marginTop: "0.5rem" }}>
          <label>
            日付:{" "}
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              required
            />
          </label>
          <label style={{ marginLeft: "0.5rem" }}>
            内容:{" "}
            <input
              type="text"
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              required
            />
          </label>
          <button type="submit" style={{ marginLeft: "0.5rem" }}>
            {editEvent ? "更新" : "追加"}
          </button>
          {editEvent && (
            <button type="button" onClick={() => { setEditEvent(null); setDateInput(""); setDescInput(""); }} style={{ marginLeft: "0.5rem" }}>
              キャンセル
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
