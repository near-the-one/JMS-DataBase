import React from 'react';
import { createPortal } from 'react-dom';
import type { FilterValues } from '@/hooks/useFilters';
import { POTENTIAL_LABELS, CUBE_LABELS, GRADE_LABELS } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (values: FilterValues) => void;
  initial: FilterValues;
};

export function FilterDialog({ open, onClose, onApply, initial }: Props) {
  const [local, setLocal] = React.useState<FilterValues>(initial);

  const set = <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  if (!open) return null;

  return createPortal(
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        <h3>フィルター設定</h3>
        {/* Server */}
        <label>
          サーバー
          <select value={local.server} onChange={e => set('server', e.target.value as any)}>
            <option value="all">全サーバー</option>
            {Object.entries({}) /* placeholder, will be replaced below */}
          </select>
        </label>
        {/* Potential */}
        <label>
          潜在能力
          <select value={local.potential} onChange={e => set('potential', e.target.value as any)}>
            <option value="all">全種別</option>
            {Object.entries(POTENTIAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        {/* Cube */}
        <label>
          キューブ
          <select value={local.cube} onChange={e => set('cube', e.target.value as any)}>
            <option value="all">全種別</option>
            {Object.entries(CUBE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        {/* Grade before */}
        <label>
          等級 (開始)
          <select value={local.grade_before} onChange={e => set('grade_before', e.target.value as any)}>
            <option value="all">全等級</option>
            {Object.entries(GRADE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        {/* Grade after */}
        <label>
          等級 (終了)
          <select value={local.grade_after} onChange={e => set('grade_after', e.target.value as any)}>
            <option value="all">全等級</option>
            {Object.entries(GRADE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        {/* Quantity min */}
        <label>
          使用個数 ≥
          <input type="number" value={local.quantity_min ?? ''} onChange={e => set('quantity_min', e.target.value ? Number(e.target.value) : null)} />
        </label>
        {/* Quantity max */}
        <label>
          使用個数 ≤
          <input type="number" value={local.quantity_max ?? ''} onChange={e => set('quantity_max', e.target.value ? Number(e.target.value) : null)} />
        </label>
        {/* Character */}
        <label>
          キャラクター名
          <input type="text" value={local.character} onChange={e => set('character', e.target.value)} />
        </label>
        {/* Date from */}
        <label>
          登録日 ≥
          <input type="date" value={local.date_from} onChange={e => set('date_from', e.target.value)} />
        </label>
        {/* Date to */}
        <label>
          登録日 ≤
          <input type="date" value={local.date_to} onChange={e => set('date_to', e.target.value)} />
        </label>
        <div style={{ marginTop: '1rem' }}>
          <button onClick={() => onApply(local)}>適用</button>
          <button onClick={onClose} style={{ marginLeft: '0.5rem' }}>キャンセル</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  background: '#fff', padding: '1rem', borderRadius: '4px', minWidth: '200px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
};
