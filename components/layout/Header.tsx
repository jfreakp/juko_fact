"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1
          className="text-3xl font-black tracking-tight leading-none"
          style={{ color: "var(--text-base)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm font-medium mt-1.5" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
