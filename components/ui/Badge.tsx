type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
};

const estadoBadge: Record<string, BadgeVariant> = {
  PENDIENTE: "warning",
  ENVIADO: "info",
  AUTORIZADO: "success",
  RECHAZADO: "danger",
  ANULADO: "default",
  PRUEBAS: "warning",
  PRODUCCION: "success",
};

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  estado?: string;
}

export default function Badge({ children, variant, estado }: BadgeProps) {
  const v = variant ?? (estado ? estadoBadge[estado] ?? "default" : "default");
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[v]}`}
    >
      {children}
    </span>
  );
}
