import { useState, useCallback, useEffect, useRef } from "react";
import { MessageDialog } from '@/components/MessageDialog';
import { createRecordRepository } from "@/data/recordRepository";
import { Routes, Route, useInRouterContext } from "react-router-dom";
import { Dashboard } from "@/components/Dashboard";
import { ManualEntryForm } from "@/components/ManualEntryForm";
import type { ManualEntryInput } from "@/components/ManualEntryForm";
import type { ManualEntryRecord } from "@/types";
import "./common.module.css";

/** Phase 2: トップページ（Supabase連携）。CRUD処理は同期的にstate更新し、repo非同期待機しない */
function HomePage() {
  const repo = createRecordRepository();
  const [records, setRecords] = useState<ManualEntryRecord[]>([]);
  const [editId, setEditId] = useState<number | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'error' | 'success'>('error');
  const [dialogMessage, setDialogMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'register'>('dashboard');
  const nextIdRef = useRef(1);
  const [formResetKey, setFormResetKey] = useState(0);

  const showError = (msg: string) => {
    setDialogMessage(msg);
    setDialogType('error');
    setDialogOpen(true);
  };
  const showSuccess = (msg: string) => {
    setDialogMessage(msg);
    setDialogType('success');
    setDialogOpen(true);
  };

  useEffect(() => {
    repo.getAll().then((data) => {
      setRecords(data);
    }).catch((err: Error) => {
      showError(err.message || "データの読み込みに失敗しました");
    });
  }, []);

  const editingRecord = editId
    ? records.find((r) => r.id === editId)
    : undefined;

  const handleSubmit = useCallback(
    (data: ManualEntryInput & { id?: number }) => {
      const { id, ...inputData } = data;
      if (id != null) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, ...inputData } : r,
          ),
        );
        setEditId(undefined);
        repo.update(id, inputData as Omit<ManualEntryRecord, "id">)
          .catch((err: Error) => showError(err.message));
        showSuccess('更新が成功しました');
        setFormResetKey((k) => k + 1);
      } else {
        const newRecord: ManualEntryRecord = {
          ...inputData,
          id: nextIdRef.current++,
        } as ManualEntryRecord;
        setRecords((prev) => [...prev, newRecord]);
        repo.add(inputData as Omit<ManualEntryRecord, "id">)
          .then(() => {
            showSuccess('登録が成功しました');
            setFormResetKey((k) => k + 1);
          })
          .catch((err: Error) => showError(err.message));
      }
    },
    [repo],
  );

  return (
    <div>
      <MessageDialog open={dialogOpen} type={dialogType} message={dialogMessage} onClose={() => setDialogOpen(false)} />
      {/* タイトルとサンプルデータ数は常に表示 */}
      <header style={{ textAlign: "center", marginBottom: "1rem" }}>
        <h1><a href="/" style={{ textDecoration: "none", color: "inherit" }}>Maple CUBE</a></h1>
        <div style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          サンプルデータ数: {records.reduce((sum, r) => sum + r.quantity_used, 0).toLocaleString()} 個
        </div>
      </header>
      {/* タブ切替 */}
      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
          className={activeTab === 'dashboard' ? 'active' : ''}
        >
          ダッシュボード
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'register'}
          onClick={() => setActiveTab('register')}
          className={activeTab === 'register' ? 'active' : ''}
        >
          登録フォーム
        </button>
      </div>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'register' && (
        <>
          <h2>キューブ使用データ登録</h2>
          <ManualEntryForm
            key={formResetKey}
            onSubmit={handleSubmit}
            initialData={editingRecord}
            editId={editId}
          />
        </>
      )}
      <footer style={{ marginTop: "3rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)", textAlign: "center", color: "var(--color-text-muted)" }}>
        <a href="https://x.com/Hn2Wb" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
          @Hn2Wb on X
        </a>
      </footer>
    </div>
  );
}

/**
 * App component: when rendered inside a Router, uses Routes for / and /admin.
 * When rendered without a Router (legacy App.test.tsx), falls back to HomePage directly.
 */
export function App() {   const inRouter = useInRouterContext();
  if (inRouter) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    );
  }
  return <HomePage />;
}

/** ルーター付きApp。 react-router-dom の context 下でルーティングを行う */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}