import React from 'react';

export default function Sidebar({ isOpen, items, activeTab, onTabChange }) {
  return (
    <aside className={`sidebar ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="sidebar-header">
        <div style={{
          background: 'var(--gradient-primary)',
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.25rem'
        }}>
          💰
        </div>
        <div>
          <h1>TallyBackup</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Pro</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            style={{
              background: activeTab === item.id ? 'var(--gradient-primary)' : 'transparent',
              color: activeTab === item.id ? 'white' : 'var(--neutral-600)',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              justifyContent: 'flex-start'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
            <span style={{ fontWeight: 500 }}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--primary-50)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
            v1.0.0
          </p>
        </div>
      </div>
    </aside>
  );
}
