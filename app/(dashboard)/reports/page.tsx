"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalesRow {
  period: string;
  count: number;
  subtotal: number;
  iva: number;
  total: number;
}

interface SalesData {
  rows: SalesRow[];
  groupBy: "day" | "month";
}

interface IvaData {
  facturas: number;
  base0: number;
  base5: number;
  base15: number;
  baseNoIva: number;
  descuento: number;
  iva: number;
  total: number;
}

interface TopProductRow {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  subtotal: number;
}

type Tab = "sales" | "iva" | "top-products";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string, groupBy: "day" | "month") {
  const d = new Date(iso);
  if (groupBy === "month") {
    return d.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
  }
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Date presets ─────────────────────────────────────────────────────────────

function getPreset(id: string): { from: Date; to: Date } {
  const now = new Date();
  switch (id) {
    case "today": {
      const d = new Date(now); d.setHours(0, 0, 0, 0);
      return { from: d, to: now };
    }
    case "week": {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay());
      d.setHours(0, 0, 0, 0);
      return { from: d, to: now };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "prev-month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to   = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to };
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1), to: now };
    }
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    default:
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
}

const PRESETS = [
  { id: "today",      label: "Hoy" },
  { id: "week",       label: "Esta semana" },
  { id: "month",      label: "Este mes" },
  { id: "prev-month", label: "Mes anterior" },
  { id: "quarter",    label: "Este trimestre" },
  { id: "year",       label: "Este año" },
];

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1"
      style={{
        background: accent ? "var(--primary)" : "var(--surface-white)",
      }}
    >
      <p
        className="text-[9px] font-bold tracking-[0.15em] uppercase"
        style={{ color: accent ? "var(--on-primary)" : "var(--text-muted)" }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-black"
        style={{ color: accent ? "var(--on-primary)" : "var(--text-base)" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-[10px] font-medium"
          style={{ color: accent ? "var(--on-primary)" : "var(--text-muted)", opacity: 0.8 }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── IVA field box ────────────────────────────────────────────────────────────

function IvaField({
  campo,
  label,
  value,
  accent,
}: {
  campo: string;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl"
      style={{
        background: accent ? "var(--primary)" : "var(--surface-white)",
        border: accent ? "none" : "1px solid var(--surface-highest)",
      }}
    >
      <div>
        <span
          className="text-[9px] font-bold tracking-widest uppercase mr-3"
          style={{
            color: accent ? "var(--on-primary)" : "var(--text-muted)",
            opacity: 0.7,
          }}
        >
          {campo}
        </span>
        <span
          className="text-sm font-bold"
          style={{ color: accent ? "var(--on-primary)" : "var(--text-base)" }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-xl font-black font-mono"
        style={{ color: accent ? "var(--on-primary)" : "var(--text-base)" }}
      >
        ${fmt(value)}
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <div
        className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: "var(--surface-low)" }}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          style={{ color: "var(--text-muted)" }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p className="text-sm font-bold" style={{ color: "var(--text-base)" }}>Sin datos</p>
      <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{message}</p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3 py-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton h-10 rounded-lg" />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [activePreset, setActivePreset] = useState("month");
  const [from, setFrom] = useState(toISODate(getPreset("month").from));
  const [to,   setTo]   = useState(toISODate(new Date()));

  const [salesData,   setSalesData]   = useState<SalesData | null>(null);
  const [ivaData,     setIvaData]     = useState<IvaData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const base = `/api/reports?from=${from}&to=${to}`;
    try {
      const [sRes, iRes, tRes] = await Promise.all([
        fetch(`${base}&type=sales`),
        fetch(`${base}&type=iva`),
        fetch(`${base}&type=top-products`),
      ]);
      const [s, iv, tp] = await Promise.all([sRes.json(), iRes.json(), tRes.json()]);
      if (s.success)  setSalesData(s.data);
      if (iv.success) setIvaData(iv.data);
      if (tp.success) setTopProducts(tp.data);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Preset handler ────────────────────────────────────────────────────────

  function applyPreset(id: string) {
    setActivePreset(id);
    const { from: f, to: t } = getPreset(id);
    setFrom(toISODate(f));
    setTo(toISODate(t));
  }

  // ── CSV exports ───────────────────────────────────────────────────────────

  function exportSalesCSV() {
    if (!salesData) return;
    const header = "Período,Facturas,Subtotal sin IVA,IVA,Total\n";
    const rows = salesData.rows.map((r) =>
      `"${fmtDate(r.period, salesData.groupBy)}",${r.count},${r.subtotal.toFixed(2)},${r.iva.toFixed(2)},${r.total.toFixed(2)}`
    ).join("\n");
    downloadCSV(`ventas_${from}_${to}.csv`, header + rows);
  }

  function exportIvaCSV() {
    if (!ivaData) return;
    const lines = [
      `"Período","${from} al ${to}"`,
      `"Facturas emitidas",${ivaData.facturas}`,
      `""`,
      `"Campo Form. 104","Valor USD"`,
      `"401 - Base imponible tarifa 0%","${ivaData.base0.toFixed(2)}"`,
      `"405 - Base imponible tarifa 5%","${ivaData.base5.toFixed(2)}"`,
      `"412 - Base imponible gravada 15%","${ivaData.base15.toFixed(2)}"`,
      `"413 - IVA generado 15%","${ivaData.iva.toFixed(2)}"`,
      `""`,
      `"Total descuentos","${ivaData.descuento.toFixed(2)}"`,
      `"Total ventas con IVA","${ivaData.total.toFixed(2)}"`,
    ].join("\n");
    downloadCSV(`iva_${from}_${to}.csv`, lines);
  }

  function exportTopCSV() {
    if (!topProducts) return;
    const header = "Posición,Código,Descripción,Cantidad vendida,Subtotal sin IVA\n";
    const rows = topProducts.map((r, i) =>
      `${i + 1},"${r.codigoPrincipal}","${r.descripcion}",${r.cantidad.toFixed(2)},${r.subtotal.toFixed(2)}`
    ).join("\n");
    downloadCSV(`top_productos_${from}_${to}.csv`, header + rows);
  }

  // ── Totals from sales data ────────────────────────────────────────────────

  const salesTotals = salesData?.rows.reduce(
    (acc, r) => ({
      count: acc.count + r.count,
      subtotal: acc.subtotal + r.subtotal,
      iva: acc.iva + r.iva,
      total: acc.total + r.total,
    }),
    { count: 0, subtotal: 0, iva: 0, total: 0 }
  ) ?? { count: 0, subtotal: 0, iva: 0, total: 0 };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
      <Header
        title="Reportes"
        subtitle="Análisis de ventas, IVA y productos"
      />

      {/* ── Date range ─────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
        style={{ background: "var(--surface-white)" }}
      >
        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors"
              style={
                activePreset === p.id
                  ? { background: "var(--text-base)", color: "var(--surface-white)" }
                  : { background: "var(--surface-low)", color: "var(--text-muted)" }
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => { setFrom(e.target.value); setActivePreset(""); }}
            className="text-sm px-3 py-1.5 rounded-lg outline-none"
            style={{
              background: "var(--surface-low)",
              color: "var(--text-base)",
              border: "2px solid var(--border-subtle)",
            }}
          />
          <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>—</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => { setTo(e.target.value); setActivePreset(""); }}
            className="text-sm px-3 py-1.5 rounded-lg outline-none"
            style={{
              background: "var(--surface-low)",
              color: "var(--text-base)",
              border: "2px solid var(--border-subtle)",
            }}
          />
          <Button size="sm" onClick={fetchAll} loading={loading}>
            Aplicar
          </Button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6">
        {(
          [
            { id: "sales",        label: "Ventas" },
            { id: "iva",          label: "IVA Form. 104" },
            { id: "top-products", label: "Top Productos" },
          ] as { id: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors"
            style={
              activeTab === tab.id
                ? { background: "var(--primary)", color: "var(--on-primary)" }
                : { background: "var(--surface-white)", color: "var(--text-muted)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: VENTAS                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Facturas emitidas"
              value={salesTotals.count.toString()}
              sub="no anuladas"
            />
            <MetricCard
              label="Subtotal sin IVA"
              value={`$${fmt(salesTotals.subtotal)}`}
              sub="base imponible"
            />
            <MetricCard
              label="IVA cobrado"
              value={`$${fmt(salesTotals.iva)}`}
            />
            <MetricCard
              label="Total vendido"
              value={`$${fmt(salesTotals.total)}`}
              accent
            />
          </div>

          {/* Table */}
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-white)" }}>
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid var(--surface-highest)" }}
            >
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
                Detalle por {salesData?.groupBy === "month" ? "mes" : "día"}
              </p>
              <Button size="sm" variant="ghost" onClick={exportSalesCSV}>
                Exportar CSV
              </Button>
            </div>

            {loading ? (
              <div className="px-6"><Skeleton /></div>
            ) : !salesData || salesData.rows.length === 0 ? (
              <EmptyState message="No hay facturas en el período seleccionado" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ background: "var(--surface-low)" }}>
                    {["Período", "Facturas", "Subtotal sin IVA", "IVA", "Total"].map((h, i) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-[9px] font-bold tracking-[0.15em] uppercase"
                        style={{
                          color: "var(--text-muted)",
                          textAlign: i === 0 ? "left" : "right",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salesData.rows.map((row, idx) => (
                    <tr
                      key={row.period}
                      style={{ background: idx % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                    >
                      <td className="px-6 py-3 text-sm font-bold" style={{ color: "var(--text-base)" }}>
                        {fmtDate(row.period, salesData.groupBy)}
                      </td>
                      <td className="px-6 py-3 text-sm text-right" style={{ color: "var(--text-base)" }}>
                        {row.count}
                      </td>
                      <td className="px-6 py-3 text-sm font-mono text-right" style={{ color: "var(--text-base)" }}>
                        ${fmt(row.subtotal)}
                      </td>
                      <td className="px-6 py-3 text-sm font-mono text-right" style={{ color: "var(--text-muted)" }}>
                        ${fmt(row.iva)}
                      </td>
                      <td className="px-6 py-3 text-sm font-mono font-bold text-right" style={{ color: "var(--text-base)" }}>
                        ${fmt(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr style={{ background: "var(--surface-highest)" }}>
                    <td className="px-6 py-3 text-[10px] font-black tracking-widest uppercase" style={{ color: "var(--text-base)" }}>
                      Total período
                    </td>
                    <td className="px-6 py-3 text-sm font-black text-right" style={{ color: "var(--text-base)" }}>
                      {salesTotals.count}
                    </td>
                    <td className="px-6 py-3 text-sm font-mono font-black text-right" style={{ color: "var(--text-base)" }}>
                      ${fmt(salesTotals.subtotal)}
                    </td>
                    <td className="px-6 py-3 text-sm font-mono font-black text-right" style={{ color: "var(--text-muted)" }}>
                      ${fmt(salesTotals.iva)}
                    </td>
                    <td
                      className="px-6 py-3 text-sm font-mono font-black text-right"
                      style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                    >
                      ${fmt(salesTotals.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: IVA Form. 104                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "iva" && (
        <div className="space-y-4 max-w-2xl">
          <div
            className="px-4 py-3 rounded-xl flex items-start gap-3"
            style={{ background: "var(--warning-bg)" }}
          >
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              style={{ color: "var(--warning-text)" }}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-medium" style={{ color: "var(--warning-text)" }}>
              Estos valores corresponden a las ventas del período seleccionado.
              Revise con su contador antes de usarlos en la declaración.
              No incluye facturas anuladas ni rechazadas.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl p-6" style={{ background: "var(--surface-white)" }}>
              <Skeleton />
            </div>
          ) : !ivaData ? (
            <EmptyState message="No se pudo cargar el resumen de IVA" />
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-white)" }}>
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: "1px solid var(--surface-highest)" }}
              >
                <div>
                  <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
                    Formulario 104 — Declaración de IVA
                  </p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {from} al {to} · {ivaData.facturas} factura{ivaData.facturas !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={exportIvaCSV}>
                  Exportar CSV
                </Button>
              </div>

              <div className="p-6 space-y-2">
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--text-muted)" }}>
                  Ventas y base imponible
                </p>
                <IvaField campo="401" label="Base imponible tarifa 0%" value={ivaData.base0} />
                {ivaData.base5 > 0 && (
                  <IvaField campo="405" label="Base imponible tarifa 5%" value={ivaData.base5} />
                )}
                <IvaField campo="412" label="Base imponible gravada 15%" value={ivaData.base15} />
                {ivaData.baseNoIva > 0 && (
                  <IvaField campo="——" label="No sujeto a IVA" value={ivaData.baseNoIva} />
                )}
                {ivaData.descuento > 0 && (
                  <IvaField campo="——" label="Descuentos aplicados" value={ivaData.descuento} />
                )}

                <div style={{ borderTop: "2px solid var(--surface-highest)", paddingTop: "12px", marginTop: "12px" }}>
                  <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--text-muted)" }}>
                    IVA generado
                  </p>
                  <IvaField campo="413" label="IVA generado 15%" value={ivaData.iva} />
                </div>

                <div style={{ borderTop: "2px solid var(--surface-highest)", paddingTop: "12px", marginTop: "4px" }}>
                  <IvaField campo="——" label="Total ventas con IVA" value={ivaData.total} accent />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: TOP PRODUCTOS                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "top-products" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-white)" }}>
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--surface-highest)" }}
          >
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
              Top 10 productos por monto vendido
            </p>
            <Button size="sm" variant="ghost" onClick={exportTopCSV}>
              Exportar CSV
            </Button>
          </div>

          {loading ? (
            <div className="px-6"><Skeleton /></div>
          ) : !topProducts || topProducts.length === 0 ? (
            <EmptyState message="No hay ventas en el período seleccionado" />
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--surface-low)" }}>
                  {["#", "Código", "Descripción", "Cantidad", "Subtotal sin IVA"].map((h, i) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-[9px] font-bold tracking-[0.15em] uppercase"
                      style={{
                        color: "var(--text-muted)",
                        textAlign: i >= 3 ? "right" : i === 0 ? "center" : "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.map((row, idx) => (
                  <tr
                    key={row.codigoPrincipal + idx}
                    style={{ background: idx % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                  >
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className="w-6 h-6 rounded-lg inline-flex items-center justify-center text-[10px] font-black"
                        style={
                          idx === 0
                            ? { background: "var(--primary)", color: "var(--on-primary)" }
                            : { background: "var(--surface-highest)", color: "var(--text-muted)" }
                        }
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-sm font-semibold" style={{ color: "var(--text-base)" }}>
                      {row.codigoPrincipal}
                    </td>
                    <td className="px-6 py-3.5 text-sm font-bold" style={{ color: "var(--text-base)" }}>
                      {row.descripcion}
                    </td>
                    <td className="px-6 py-3.5 text-sm font-mono text-right" style={{ color: "var(--text-muted)" }}>
                      {row.cantidad % 1 === 0 ? row.cantidad.toFixed(0) : row.cantidad.toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-sm font-mono font-bold text-right" style={{ color: "var(--text-base)" }}>
                      ${fmt(row.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
