import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '24px 20px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        {children}
      </main>
      <footer
        style={{
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          padding: '20px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.85rem'
        }}
      >
        Fraud Bank Simulated System &copy; 2026. For learning and demonstration purposes only.
      </footer>
    </div>
  );
}
