import React from 'react';

export default function Table({
  headers = [],
  columns = [],
  children,
  emptyMessage = 'No records found',
  isEmpty = false
}) {
  const columnHeaders = headers.length > 0 ? headers : columns;

  // Inspect children to see if the caller passed raw <tr> rows or already wrapped in <tbody> / <thead>
  let tableRows = children;
  let customThead = null;

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === 'thead') {
        customThead = child;
      } else if (child.type === 'tbody') {
        tableRows = child.props.children;
      }
    }
  });

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04), 0 2px 4px -1px rgba(15, 23, 42, 0.02)',
        position: 'relative'
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.92rem'
        }}
      >
        {/* Render only ONE header: custom thead if passed, or generated from columnHeaders */}
        {customThead ? (
          customThead
        ) : columnHeaders.length > 0 ? (
          <thead>
            <tr
              style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                borderBottom: '1px solid #e2e8f0',
                color: '#475569'
              }}
            >
              {columnHeaders.map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: '14px 18px',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    color: '#475569'
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}

        <tbody>
          {isEmpty ? (
            <tr>
              <td
                colSpan={columnHeaders.length || 1}
                style={{
                  padding: '48px 16px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.94rem'
                }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '8px', opacity: 0.7 }}>📋</div>
                <div>{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            tableRows
          )}
        </tbody>
      </table>
    </div>
  );
}
