import React from 'react';

export default function Pagination({ page = 1, totalPages = 1, onPageChange, total = null }) {
  if (totalPages <= 1 && !total) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 4px',
        flexWrap: 'wrap',
        gap: '12px'
      }}
    >
      <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
        Page <span style={{ fontWeight: '600', color: '#0f172a' }}>{page}</span> of{' '}
        <span style={{ fontWeight: '600', color: '#0f172a' }}>{Math.max(1, totalPages)}</span>
        {total !== null && ` (${total} total records)`}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-secondary btn-sm"
        >
          &larr; Previous
        </button>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-secondary btn-sm"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
