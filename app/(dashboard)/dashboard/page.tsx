"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface DashboardData {
  // Históricos
  totalFacturas: number;
  pendientes: number;
  autorizadas: number;
  rechazadas: number;
  anuladas: number;
  devueltas: number;
  // Hoy
  ventasHoy: number;
  facturasHoy: number;
  // Mes
  ventasMes: number;
  ivaMes: number;
  facturasMes: number;
  // Compras
  comprasMes: number;
  nComprasMes: number;
  // Inventario
  alertasStock: number;
  // Tablas
  recentInvoices: {
    id: string;
    secuencial: string;
    razonSocial: string;
    importeTotal: number;
    estado: string;
    fechaEmision: string;
  }[];
  topProductos: {
    codigo: string;
    descripcion: string;
    cantidad: number;
    subtotal: number;
  }[];
}

function fmt(n: number) {
  return n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  accentText,
  loading,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  accentText: string;
  loading: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 h-full"
      style={{ background: "var(--surface-white)" }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: accent }}
      />
      <div>
        <p
          className="text-[10px] font-bold tracking-widest uppercase mb-1"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
        {loading ? (
          <span className="skeleton inline-block w-24 h-8 rounded" />
        ) : (
          <p className="text-3xl font-black leading-none" style={{ color: "var(--text-base)" }}>
            {value}
          </p>
        )}
        {sub && !loading && (
          <p className="text-[11px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const mesActual = new Date().toLocaleDateString("es-EC", { month: "long", year: "numeric" });

  return (
    <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
      <Header
        title="Dashboard"
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
        action={
          <Link href="/invoices/new">
            <Button>+ Nueva Factura</Button>
          </Link>
        }
      />

      {/* ── Fila 1: KPIs de dinero ── */}
      <p
        className="text-[9px] font-bold tracking-[0.15em] uppercase mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        Facturación — {mesActual}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Ventas Hoy"
          value={`$${fmt(data?.ventasHoy ?? 0)}`}
          sub={`${data?.facturasHoy ?? 0} factura${(data?.facturasHoy ?? 0) !== 1 ? "s" : ""}`}
          accent="var(--primary)"
          accentText="var(--on-primary)"
          loading={loading}
          href="/invoices"
        />
        <KpiCard
          label="Ventas del Mes"
          value={`$${fmt(data?.ventasMes ?? 0)}`}
          sub={`${data?.facturasMes ?? 0} factura${(data?.facturasMes ?? 0) !== 1 ? "s" : ""}`}
          accent="var(--success-bg)"
          accentText="var(--success-text)"
          loading={loading}
          href="/invoices"
        />
        <KpiCard
          label="IVA del Mes"
          value={`$${fmt(data?.ivaMes ?? 0)}`}
          sub="Acumulado período"
          accent="var(--surface-highest)"
          accentText="var(--text-secondary)"
          loading={loading}
        />
        <KpiCard
          label="Compras del Mes"
          value={`$${fmt(data?.comprasMes ?? 0)}`}
          sub={`${data?.nComprasMes ?? 0} orden${(data?.nComprasMes ?? 0) !== 1 ? "es" : ""}`}
          accent="var(--surface-highest)"
          accentText="var(--text-secondary)"
          loading={loading}
          href="/purchases"
        />
      </div>

      {/* ── Fila 2: KPIs operacionales ── */}
      <p
        className="text-[9px] font-bold tracking-[0.15em] uppercase mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        Estado SRI — Histórico
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Total Facturas"
          value={String(data?.totalFacturas ?? 0)}
          accent="var(--surface-highest)"
          accentText="var(--text-secondary)"
          loading={loading}
          href="/invoices"
        />
        <KpiCard
          label="Pendientes SRI"
          value={String(data?.pendientes ?? 0)}
          sub={data?.devueltas ? `+ ${data.devueltas} devuelta${data.devueltas !== 1 ? "s" : ""}` : undefined}
          accent="#fef9c3"
          accentText="#854d0e"
          loading={loading}
          href="/invoices?estado=PENDIENTE"
        />
        <KpiCard
          label="Autorizadas"
          value={String(data?.autorizadas ?? 0)}
          accent="var(--success-bg)"
          accentText="var(--success-text)"
          loading={loading}
          href="/invoices?estado=AUTORIZADO"
        />
        <KpiCard
          label="Alertas Inventario"
          value={String(data?.alertasStock ?? 0)}
          sub={data?.alertasStock ? "Productos bajo mínimo" : "Sin alertas"}
          accent={data?.alertasStock ? "var(--error-bg)" : "var(--success-bg)"}
          accentText={data?.alertasStock ? "var(--error-text)" : "var(--success-text)"}
          loading={loading}
          href="/inventory"
        />
      </div>

      {/* ── Fila 3: Tablas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Facturas recientes (2/3) */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{ background: "var(--surface-white)" }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--surface-highest)" }}
          >
            <div>
              <h2 className="text-sm font-black tracking-tight" style={{ color: "var(--text-base)" }}>
                Facturas Recientes
              </h2>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                Últimas 5 transacciones
              </p>
            </div>
            <Link
              href="/invoices"
              className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: "var(--primary-focus)" }}
            >
              Ver todas →
            </Link>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-11 rounded-lg" />
              ))}
            </div>
          ) : !data?.recentInvoices.length ? (
            <div className="p-16 text-center">
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>
                Sin facturas aún
              </p>
              <p className="text-[11px] mb-5" style={{ color: "var(--text-muted)" }}>
                Cree su primera factura electrónica
              </p>
              <Link href="/invoices/new">
                <Button size="sm">Crear factura</Button>
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--surface-low)" }}>
                  {["Número", "Cliente", "Fecha", "Total", "Estado"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-left text-[9px] font-bold tracking-[0.15em] uppercase ${i === 3 ? "text-right" : ""}`}
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentInvoices.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    style={{
                      background: idx % 2 === 0 ? "var(--surface-white)" : "var(--surface)",
                    }}
                  >
                    <td className="px-5 py-3 font-mono text-sm font-semibold" style={{ color: "var(--text-base)" }}>
                      #{inv.secuencial}
                    </td>
                    <td
                      className="px-5 py-3 text-sm font-medium max-w-[160px] truncate"
                      style={{ color: "var(--text-base)" }}
                    >
                      {inv.razonSocial}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                      {new Date(inv.fechaEmision).toLocaleDateString("es-EC")}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-right" style={{ color: "var(--text-base)" }}>
                      ${fmt(inv.importeTotal)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge estado={inv.estado}>{inv.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top productos del mes (1/3) */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--surface-white)" }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--surface-highest)" }}
          >
            <div>
              <h2 className="text-sm font-black tracking-tight" style={{ color: "var(--text-base)" }}>
                Top Productos
              </h2>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                Más vendidos este mes
              </p>
            </div>
            <Link
              href="/reports"
              className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: "var(--primary-focus)" }}
            >
              Reportes →
            </Link>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          ) : !data?.topProductos.length ? (
            <div className="p-10 text-center">
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>
                Sin ventas este mes
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Los productos aparecerán al emitir facturas
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--surface-highest)" }}>
              {data.topProductos.map((p, idx) => (
                <div key={p.codigo} className="px-5 py-3.5 flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-black"
                    style={{
                      background: idx === 0 ? "var(--primary)" : "var(--surface-low)",
                      color: idx === 0 ? "var(--on-primary)" : "var(--text-muted)",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[12px] font-semibold truncate"
                      style={{ color: "var(--text-base)" }}
                    >
                      {p.descripcion}
                    </p>
                    <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                      {Number(p.cantidad).toFixed(0)} unid.
                    </p>
                  </div>
                  <span
                    className="text-[11px] font-bold flex-shrink-0"
                    style={{ color: "var(--text-base)" }}
                  >
                    ${fmt(p.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
