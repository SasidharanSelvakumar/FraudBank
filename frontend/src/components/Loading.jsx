import React from 'react';

export default function Loading({ message = 'Loading...' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '16px'
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <span style={{ color: '#64748b', fontSize: '0.92rem', fontWeight: '500' }}>{message}</span>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
