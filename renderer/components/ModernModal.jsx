import React from 'react';

export default function ModernModal({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true
}) {
  if (!isOpen) return null;

  const sizeMap = {
    sm: '400px',
    md: '500px',
    lg: '700px',
    xl: '900px'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn var(--transition-base)'
    }}
    onClick={(e) => {
      if (closeOnBackdrop && e.target === e.currentTarget) {
        onClose();
      }
    }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdrop: 'filter blur(10px)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: 'var(--shadow-2xl)',
          maxWidth: sizeMap[size],
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          animation: 'slideUp var(--transition-base)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid var(--neutral-200)'
        }}>
          <h2 style={{ margin: 0, color: 'var(--neutral-900)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              fontSize: '1.25rem',
              padding: '0.25rem 0.5rem',
              width: 'auto',
              height: 'auto'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '1.5rem',
            borderTop: '1px solid var(--neutral-200)',
            justifyContent: 'flex-end'
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
