import React from 'react';

export default function Modal({ open, onClose, title, children, maxWidth = 520 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay modal-fade-in" onClick={onClose}>
      <div
        className="modal-content modal-zoom-in"
        style={{ maxWidth, width: '92%', margin: '0 4%', borderRadius: 14 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
