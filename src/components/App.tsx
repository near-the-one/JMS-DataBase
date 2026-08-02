import { useState, useCallback } from "react";
import { MessageDialog } from '@/components/MessageDialog';
import { createRecordRepository } from "@/data/recordRepository";
import { Routes, Route, useInRouterContext } from "react-router-dom";
import { Dashboard } from "@/components/Dashboard";
import { ManualEntryForm } from "@/components/ManualEntryForm";
import type { ManualEntryInput } from "@/components/ManualEntryForm";
import type { ManualEntryRecord } from "@/types";
import { useCubeStats } from "@/hooks/useCubeStats";
import "./common.module.css";

/** Phase 2: トップページ（Supabase連携）。登録処理のみ対応 */
function HomePage() {
  const repo = createRecordRepository();
  const [formResetKey, setFormResetKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'error' | 'success'>('error');
  const [dialogMessage, setDialogMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'register'>('dashboard');

  // 統計データは親で保持し、タブ切り替えでも再フェッチしない
  const { data: statsResponse, participantUsers, isMiracleTime } = useCubeStats({
    intervalMs: 5 * 60 * 1000,
    enabled: true,
  });

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

  const handleSubmit = useCallback(
    (data: ManualEntryInput) => {
      repo.add({
        ...data,
        created_at: Date.now(),
      } as Omit<ManualEntryRecord, "id">)
        .then(() => {
          showSuccess('登録が成功しました');
          setFormResetKey((k) => k + 1);
        })
        .catch((err: Error) => showError(err.message));
    },
    [repo],
  );

  return (
    <>
      <MessageDialog open={dialogOpen} type={dialogType} message={dialogMessage} onClose={() => setDialogOpen(false)} />
      <header>
        <a href="/" className="logo"><img src="/assets/site-icons/サイトロゴ2.png" alt="JMS DataBase" style={{ height: '70px', maxHeight: '70px' }} /></a>
        <nav>
          <button
            role="tab"
            aria-selected={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            className={`navtab ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            ダッシュボード
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'register'}
            onClick={() => setActiveTab('register')}
            className={`navtab ${activeTab === 'register' ? 'active' : ''}`}
          >
            登録フォーム
          </button>
        </nav>
      </header>
      <main>
        {/* Dashboard は常にマウントし、CSS で表示/非表示を切り替え */}
        <Dashboard
          statsResponse={statsResponse}
          participantUsers={participantUsers}
          isMiracleTime={isMiracleTime}
          latestUpdatedAt={statsResponse?.meta?.latest_created_at ?? null}
          style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}
        />
        {activeTab === 'register' && (
          <>
            <div className="page-head">
              <div className="eyebrow">SUBMIT DATA</div>
              <h1>キューブ使用データ登録</h1>
              <p>使用したキューブの情報を入力してください。</p>
            </div>
            <div className="form-card">
              <ManualEntryForm
                key={formResetKey}
                onSubmit={handleSubmit}
                initialData={{}}
                editId={undefined}
              />
            </div>
          </>
        )}
      </main>
      <footer>JMS DataBase — コミュニティ計測による非公式データベース</footer>
    </>
  );
}

/**
 * App component: when rendered inside a Router, uses Routes for /.
 * When rendered without a Router (legacy App.test.tsx), falls back to HomePage directly.
 */
export function App() {
  const inRouter = useInRouterContext();
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