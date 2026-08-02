import { useCallback } from "react";

type ViewName = "dashboard" | "list" | "form";

interface LayoutProps {
  children: React.ReactNode;
  activeView?: ViewName;
  onViewChange?: (view: ViewName) => void;
}

export function Layout({
  children,
  activeView,
  onViewChange,
}: LayoutProps) {
  // デフォルト値を設定し、null/undefined の場合は 'dashboard' を使用
  const view = activeView ?? "dashboard";

  const handleViewChange = useCallback(
    (view: ViewName) => {
      onViewChange?.(view);
    },
    [onViewChange]
  );

  return (
    <>
      <header>
        <div className="logo">
          <span className="logo-dot"></span>JMS DataBase
        </div>
        <nav role="tablist" aria-label="メインナビゲーション">
          <button
            role="tab"
            className={`navtab ${view === "dashboard" ? "active" : ""}`}
            aria-selected={view === "dashboard"}
            onClick={() => handleViewChange("dashboard")}
            id="tab-dashboard"
            aria-controls="view-dashboard"
          >
            ダッシュボード
          </button>
          <button
            role="tab"
            className={`navtab ${view === "list" ? "active" : ""}`}
            aria-selected={view === "list"}
            onClick={() => handleViewChange("list")}
            id="tab-list"
            aria-controls="view-list"
          >
            登録一覧
          </button>
          <button
            role="tab"
            className={`navtab ${view === "form" ? "active" : ""}`}
            aria-selected={view === "form"}
            onClick={() => handleViewChange("form")}
            id="tab-form"
            aria-controls="view-form"
          >
            データ登録
          </button>
        </nav>
      </header>

      <main role="main">
        {children}
      </main>

      <footer>
        JMS DataBase — コミュニティ計測による非公式データベース
      </footer>
    </>
  );
}