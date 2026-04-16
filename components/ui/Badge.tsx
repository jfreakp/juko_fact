type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

const variantStyles: Record<BadgeVariant, { background: string; color: string }> = {
  default:  { background: "var(--surface-highest)", color: "var(--text-secondary)" },
  success:  { background: "var(--success-bg)",      color: "var(--success-text)" },
  warning:  { background: "var(--warning-bg)",      color: "var(--warning-text)" },
  danger:   { background: "var(--error-bg)",        color: "var(--error-text)" },
  info:     { background: "var(--info-bg)",         color: "var(--info-text)" },
  purple:   { background: "#EDE9FE",                color: "#4C1D95" },
};

const estadoBadge: Record<string, BadgeVariant> = {
  PENDIENTE:   "warning",
  ENVIADO:     "info",
  AUTORIZADO:  "success",
  RECHAZADO:   "danger",
  ANULADO:     "default",
  PRUEBAS:     "warning",
  PRODUCCION:  "success",
  DEVUELTA:    "warning",
  ERROR:       "danger",
};

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  estado?: string;
}

export default function Badge({ children, variant, estado }: BadgeProps) {
  const v = variant ?? (estado ? estadoBadge[estado] ?? "default" : "default");
  const s = variantStyles[v];

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase"
      style={{ background: s.background, color: s.color }}
    >
      {children}
    </span>
  );
}
