"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";

interface CxCItem {
  id: string;
  totalOriginal: number;
  saldoPendiente: number;
  estado: string;
  fechaVencimiento: string;
  client: { razonSocial: string; identificacion: string };
  invoice: { secuencial: string; fechaEmision: string; importeTotal: number };
}

interface PageData {
  items: CxCItem[];
  total: number;
  page: number;
  limit: number;
}

const ESTADO_OPTIONS = [
  { value: "",          label: "Todos los estados" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "PARCIAL",   label: "Parcial" },
  { value: "VENCIDO",   label: "Vencido" },
  { value: "PAGADO",    label: "Pagado" },
  { value: "CANCELADA", label: "Cancelada" },
];

function estadoBadge(estado: string, fechaVencimiento: string) {
  // Calcular estado efectivo: si está PENDIENTE/PARCIAL y ya venció, mostrar VENCIDO
  const vencida = new Date(fechaVencimiento) < new Date();
  const efectivo =
    (estado === "PENDIENTE" || estado === "PARCIAL") && vencida
      ? "VENCIDO"
      : estado;

  const map: Record<string, { bg: string; text: string; label: string }> = {
    PENDIENTE: { bg: "var(--warning-bg)",  text: "var(--warning-text)",  label: "Pendiente" },
    PARCIAL:   { bg: "var(--warning-bg)",  text: "var(--warning-text)",  label: "Parcial"   },
    VENCIDO:   { bg: "var(--error-bg)",    text: "var(--error-text)",    label: "Vencido"   },
    PAGADO:    { bg: "var(--success-bg)",  text: "var(--success-text)",  label: "Pagado"    },
    CANCELADA: { bg: "var(--surface-highest)", text: "var(--text-muted)", label: "Cancelada" },
  };

  const cfg = map[efectivo] ?? map["PENDIENTE"];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-[0.15em] uppercase"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

function fmt(val: number) {
  return `$${Number(val).toFixed(2)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function SaldoBar({ total, saldo }: { total: number; saldo: number }) {
  const cobrado = total - saldo;
  const pct = total > 0 ? Math.min(100, (cobrado / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-highest)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: pct >= 100 ? "var(--success-text)" : "var(--primary-focus)" }}
        />
      </div>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        {fmt(saldo)}
      </span>
    </div>
  );
}

export default function CxCPage() {
  const [data, setData]     = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    const res  = await fetch(`/api/cxc?${params}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [estado]);

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--surface)" }}>
      <Header
        title="Cuentas por Cobrar"
        subtitle="Facturas a crédito y sus saldos pendientes"
      />

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm font-medium"
          style={{
            background: "var(--surface-white)",
            border: "2px solid var(--border-subtle)",
            color: "var(--text-base)",
          }}
        >
          {ESTADO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--surface-highest)" }}
      >
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>
            Cargando...
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
              No hay cuentas por cobrar
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Al emitir una factura con forma de pago Crédito, aparecerá aquí.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-mid)" }}>
                {["Cliente", "Factura #", "Total", "Saldo", "Vencimiento", "Estado", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[9px] font-bold tracking-[0.15em] uppercase"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr
                  key={item.id}
                  style={{ background: i % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-xs" style={{ color: "var(--text-base)" }}>
                      {item.client.razonSocial}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {item.client.identificacion}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs" style={{ color: "var(--text-base)" }}>
                      {item.invoice.secuencial}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-xs" style={{ color: "var(--text-base)" }}>
                    {fmt(item.totalOriginal)}
                  </td>
                  <td className="px-4 py-3">
                    <SaldoBar total={item.totalOriginal} saldo={item.saldoPendiente} />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {fmtDate(item.fechaVencimiento)}
                  </td>
                  <td className="px-4 py-3">
                    {estadoBadge(item.estado, item.fechaVencimiento)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/cxc/${item.id}`}
                      className="text-[10px] font-bold tracking-widest uppercase underline"
                      style={{ color: "var(--primary-focus)" }}
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > data.limit && (
        <p className="mt-4 text-xs text-center" style={{ color: "var(--text-muted)" }}>
          Mostrando {data.items.length} de {data.total}
        </p>
      )}
    </div>
  );
}
