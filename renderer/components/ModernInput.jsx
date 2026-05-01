import React from 'react';

export default function ModernInput({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
  helperText,
  size = 'md',
  required = false,
  disabled = false,
  icon,
  ...props
}) {
  const sizeMap = {
    sm: { padding: '0.5rem 0.75rem', fontSize: '0.8125rem' },
    md: { padding: '0.75rem 1rem', fontSize: '0.9375rem' },
    lg: { padding: '1rem 1.25rem', fontSize: '1rem' }
  };

  const inputSize = sizeMap[size];

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--neutral-900)'
        }}>
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: '0.75rem',
            fontSize: '1.125rem',
            color: 'var(--neutral-500)',
            pointerEvents: 'none'
          }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: '100%',
            border: error ? '1.5px solid var(--danger)' : '1.5px solid var(--neutral-200)',
            borderRadius: 'var(--radius-lg)',
            background: disabled ? 'var(--neutral-50)' : 'white',
            color: disabled ? 'var(--neutral-500)' : 'var(--neutral-900)',
            transition: 'all var(--transition-base)',
            paddingLeft: icon ? '2.5rem' : inputSize.padding,
            paddingRight: inputSize.padding,
            paddingTop: inputSize.padding.split(' ')[0],
            paddingBottom: inputSize.padding.split(' ')[0],
            fontSize: inputSize.fontSize,
            fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'text'
          }}
          {...props}
        />
      </div>
      {error && (
        <p style={{
          marginTop: '0.375rem',
          fontSize: '0.8125rem',
          color: 'var(--danger)',
          fontWeight: 500
        }}>
          ❌ {error}
        </p>
      )}
      {helperText && !error && (
        <p style={{
          marginTop: '0.375rem',
          fontSize: '0.8125rem',
          color: 'var(--neutral-600)'
        }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
