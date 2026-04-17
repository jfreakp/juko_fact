"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<Variant, { background: string; color: string; border?: string }> = {
  primary: {
    background: "var(--primary)",
    color: "var(--on-primary)",
  },
  secondary: {
    background: "var(--info-bg)",
    color: "var(--info-text)",
  },
  danger: {
    background: "var(--error-bg)",
    color: "var(--error-text)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-subtle)",
  },
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[11px] min-h-[32px]",
  md: "px-4 py-2 text-xs min-h-[36px]",
  lg: "px-6 py-3 text-sm min-h-[44px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  style,
  ...props
}: ButtonProps) {
  const vs = variantStyles[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-bold tracking-widest uppercase rounded-xl
        transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]
        ${sizeClasses[size]} ${className}`}
      style={{
        background: vs.background,
        color: vs.color,
        border: vs.border ?? "none",
        ...style,
      }}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
