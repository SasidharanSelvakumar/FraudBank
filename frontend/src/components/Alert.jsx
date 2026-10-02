import React from 'react';

export default function Alert({ type = 'error', message, onClose }) {
  if (!message) return null;

  const typeConfig = {
    error: {
      bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
      color: '#9f1239',
      borderColor: '#fecdd3',
      accentColor: '#f43f5e',
      icon: '⚠️'
    },
    success: {
      bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      color: '#065f46',
      borderColor: '#a7f3d0',
      accentColor: '#10b981',
      icon: '✅'
    },
    warning: {
      bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      color: '#92400e',
      borderColor: '#fde68a',
      accentColor: '#f59e0b',
      icon: '⚡'
    },
    info: {
      bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      color: '#1e40af',
      borderColor: '#bfdbfe',
      accentColor: '#3b82f6',
      icon: 'ℹ️'
    }
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: '10px',
        border: `1px solid ${config.borderColor}`,
        borderLeft: `4px solid ${config.accentColor}`,
        background: config.bg,
        color: config.color,
        fontSize: '0.92rem',
        fontWeight: '500',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.1rem' }}>{config.icon}</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '1.25rem',
            lineHeight: 1,
            opacity: 0.7,
            transition: 'opacity 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
          aria-label="Close"
        >
          &times;
        </button>
      )}
    </div>
  );
}
