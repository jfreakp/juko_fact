"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface Stats {
  total: number;
  pendientes: number;
  autorizadas: number;
  rechazadas: number;
}

interface RecentInvoice {
  id: string;
  secuencial: string;
  client: { razonSocial: string };
  importeTotal: number;
  estado: string;
  fechaEmision: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, invoicesRes] = await Promise.all([
          fetch("/api/invoices/stats"),
          fetch("/api/invoices?limit=5"),
        ]);
        const statsData = await statsRes.json();
        const invoicesData = await invoicesRes.json();
        if (statsData.success) setStats(statsData.data);
        if (invoicesData.success) setRecent(invoicesData.data.items);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    {
      label: "Total Facturas",
      value: stats?.total ?? 0,
      accent: "var(--primary)",
      accentText: "var(--on-primary)",
    },
    {
      label: "Pendientes",
      value: stats?.pendientes ?? 0,
      accent: "var(--surface-highest)",
      accentText: "var(--text-secondary)",
    },
    {
      label: "Autorizadas",
      value: stats?.autorizadas ?? 0,
      accent: "var(--success-bg)",
      accentText: "var(--success-text)",
    },
    {
      label: "Rechazadas",
      value: stats?.rechazadas ?? 0,
      accent: "var(--error-bg)",
      accentText: "var(--error-text)",
    },
  ];

  return (
    <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
      <Header
        title="Dashboard"
        subtitle="Resumen de facturación electrónica"
        action={
          <Link href="/invoices/new">
            <Button>+ Nueva Factura</Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-5"
            style={{ background: "var(--surface-white)" }}
          >
            <p
              className="text-[10px] font-bold tracking-widest uppercase mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              {card.label}
            </p>
            <div className="flex items-end justify-between">
              <p
                className="text-4xl font-black leading-none"
                style={{ color: "var(--text-base)" }}
              >
                {loading ? (
                  <span className="skeleton inline-block w-10 h-9 rounded" />
                ) : (
                  card.value
                )}
              </p>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black"
                style={{ background: card.accent, color: card.accentText }}
              >
                {loading ? "" : card.value > 0 ? "↑" : "—"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent invoices */}
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
              Facturas Recientes
            </h2>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
              Últimas 5 transacciones procesadas
            </p>
          </div>
          <Link
            href="/invoices"
            className="text-[11px] font-bold tracking-widest uppercase transition-colors"
            style={{ color: "var(--primary-focus)" }}
          >
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-16 text-center">
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "var(--surface-low)" }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>No hay facturas</p>
            <p className="text-[11px] font-medium mb-5" style={{ color: "var(--text-muted)" }}>
              Empiece creando su primera factura electrónica
            </p>
            <Link href="/invoices/new">
              <Button size="sm">Crear primera factura</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr
                className="text-left"
                style={{ background: "var(--surface-low)" }}
              >
                {["Número", "Cliente", "Fecha", "Total", "Estado"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-[9px] font-bold tracking-[0.15em] uppercase ${i === 3 ? "text-right" : ""}`}
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((inv, idx) => (
                <tr
                  key={inv.id}
                  style={{ background: idx % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                >
                  <td className="px-6 py-3.5 font-mono text-sm font-semibold" style={{ color: "var(--text-base)" }}>
                    #{inv.secuencial}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-medium" style={{ color: "var(--text-base)" }}>
                    {inv.client.razonSocial}
                  </td>
                  <td className="px-6 py-3.5 text-sm" style={{ color: "var(--text-muted)" }}>
                    {new Date(inv.fechaEmision).toLocaleDateString("es-EC")}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-bold text-right" style={{ color: "var(--text-base)" }}>
                    ${Number(inv.importeTotal).toFixed(2)}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge estado={inv.estado}>{inv.estado}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
