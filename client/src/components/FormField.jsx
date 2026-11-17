import React from 'react';

export default function FormField({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helperText,
  disabled = false,
  options = [],
  rows = 3,
  className = '',
  min,
  max,
  step,
  ...props
}) {
  const inputId = id || name;

  const baseInputStyles = `w-full rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
    error
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 text-slate-900 bg-rose-50/20'
      : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200 text-slate-900 bg-white'
  }`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      {type === 'textarea' ? (
        <textarea
          id={inputId}
          name={name}
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`${baseInputStyles} p-2.5 resize-y`}
          {...props}
        />
      ) : type === 'select' ? (
        <select
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`${baseInputStyles} px-3 py-2`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optVal} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>
      ) : (
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          className={`${baseInputStyles} px-3 py-2`}
          {...props}
        />
      )}

      {error ? (
        <p className="text-xs text-rose-600 font-medium" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}

