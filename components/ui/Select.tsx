"use client";

import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}`}
          style={{
            background: "var(--surface-white)",
            color: "var(--text-base)",
            border: error ? "2px solid var(--error-strong)" : "2px solid var(--border-subtle)",
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? "var(--error-strong)" : "var(--primary-focus)";
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? "var(--error-strong)" : "var(--border-subtle)";
            props.onBlur?.(e);
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-[11px] font-medium" style={{ color: "var(--error-strong)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
