import React from 'react';

export default function ModernProgressBar({ 
  progress = 0, 
  label = '', 
  status = 'progress',
  showPercentage = true,
  size = 'md'
}) {
  const sizeMap = {
    sm: { height: '4px', fontSize: '0.75rem' },
    md: { height: '8px', fontSize: '0.875rem' },
    lg: { height: '12px', fontSize: '1rem' }
  };

  const statusColors = {
    progress: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
    success: 'linear-gradient(90deg, #10b981, #34d399)',
    warning: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
    danger: 'linear-gradient(90deg, #ef4444, #f87171)'
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {(label || showPercentage) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          fontSize: sizeMap[size].fontSize,
          fontWeight: 600
        }}>
          <span style={{ color: 'var(--neutral-900)' }}>{label}</span>
          {showPercentage && (
            <span style={{ color: 'var(--primary)' }}>{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div style={{
        position: 'relative',
        height: sizeMap[size].height,
        background: 'var(--neutral-200)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            background: statusColors[status],
            width: `${progress}%`,
            borderRadius: 'var(--radius-full)',
            transition: 'width var(--transition-base)',
            boxShadow: `0 0 10px ${status === 'success' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(59, 130, 246, 0.5)'}`
          }}
        />
      </div>
    </div>
  );
}
