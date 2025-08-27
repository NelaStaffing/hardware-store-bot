import React from 'react';

export default function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
      <div style={{
        border: '3px solid #eee',
        borderTop: '3px solid #007aff',
        borderRadius: '50%',
        width: 24,
        height: 24,
        animation: 'spin 1s linear infinite',
      }} />
      <style>
        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}
