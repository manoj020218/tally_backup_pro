import React from 'react';

export default function ActionCard({ 
  icon, 
  title, 
  description, 
  status, 
  lastRun,
  isActive,
  onAction,
  actionLabel = 'Run Now',
  actionVariant = 'primary'
}) {
  const statusColors = {
    success: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', dot: '🟢' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', text: '#92400e', dot: '🟡' },
    danger: { bg: 'rgba(239, 68, 68, 0.1)', text: '#991b1b', dot: '🔴' },
    idle: { bg: 'rgba(107, 114, 128, 0.1)', text: '#4b5563', dot: '⚪' }
  };

  const statusConfig = statusColors[status] || statusColors.idle;

  return (
    <div className="card slide-up" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      transition: 'all var(--transition-base)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
          <div style={{ fontSize: '2rem' }}>{icon}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ marginBottom: '0.25rem', color: 'var(--neutral-900)' }}>{title}</h3>
            <p style={{ color: 'var(--neutral-600)', fontSize: '0.875rem', lineHeight: 1.4 }}>
              {description}
            </p>
          </div>
        </div>
        <div style={{
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          background: statusConfig.bg,
          color: statusConfig.text,
          fontSize: '0.75rem',
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          {statusConfig.dot} {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>

      {/* Last Run Info */}
      {lastRun && (
        <div style={{
          padding: '0.75rem',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--neutral-50)',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          color: 'var(--neutral-600)'
        }}>
          <span style={{ fontWeight: 600 }}>Last run:</span> {lastRun}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onAction}
        disabled={!isActive}
        className={`btn-${actionVariant}`}
        style={{
          marginTop: 'auto',
          width: '100%',
          opacity: isActive ? 1 : 0.6
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
