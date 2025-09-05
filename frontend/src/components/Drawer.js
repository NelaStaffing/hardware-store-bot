import React from 'react';

export default function Drawer({ open, onClose, title, children, side = 'right' }) {
  if (!open) return null;
  return (
    <div className="drawer-overlay drawer-fade-in" onClick={onClose}>
      <div
        className={`drawer-panel ${side} ${side === 'left' ? 'drawer-slide-in-left' : 'drawer-slide-in-right'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div className="drawer-title">{title}</div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">
          {children}
        </div>
      </div>
    </div>
  );
}
