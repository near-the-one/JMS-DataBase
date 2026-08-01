import React from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  type: 'error' | 'success';
  message: string;
  onClose: () => void;
};

export function MessageDialog({ open, type, message, onClose }: Props) {
  if (!open) return null;
  return createPortal(
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: type === 'error' ? '#b00020' : '#006400' }}>
          {type === 'error' ? 'エラー' : '成功'}
        </h3>
        <p>{message}</p>
        <button onClick={onClose} style={{ marginTop: '0.5rem' }}>閉じる</button>
      </div>
    </div>,
    document.body,
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  background: '#fff',
  padding: '1rem',
  borderRadius: '4px',
  minWidth: '200px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
};
