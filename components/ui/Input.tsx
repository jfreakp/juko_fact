"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, style, ...props }, ref) => {
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
        <input
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
        />
        {error && (
          <p className="text-[11px] font-medium" style={{ color: "var(--error-strong)" }}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
