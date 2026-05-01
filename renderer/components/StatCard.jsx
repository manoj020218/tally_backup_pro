import React from 'react';

export default function StatCard({ icon, label, value, trend, unit = '', color = 'primary' }) {
  const bgGradient = {
    primary: 'var(--gradient-primary)',
    success: 'var(--gradient-success)',
    accent: 'var(--gradient-accent)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
  };

  return (
    <div className="card slide-up" style={{ background: bgGradient[color], color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>{label}</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {value}
            <span style={{ fontSize: '1rem', marginLeft: '0.25rem' }}>{unit}</span>
          </p>
          {trend && (
            <p style={{
              fontSize: '0.8rem',
              marginTop: '0.75rem',
              opacity: 0.9,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              {trend > 0 ? '📈' : '📉'} {Math.abs(trend)}% {trend > 0 ? 'increase' : 'decrease'}
            </p>
          )}
        </div>
        <div style={{
          fontSize: '2rem',
          opacity: 0.7
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
