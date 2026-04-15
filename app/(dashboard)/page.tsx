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
      color: "bg-blue-500",
      icon: "📄",
    },
    {
      label: "Pendientes",
      value: stats?.pendientes ?? 0,
      color: "bg-yellow-500",
      icon: "⏳",
    },
    {
      label: "Autorizadas",
      value: stats?.autorizadas ?? 0,
      color: "bg-green-500",
      icon: "✅",
    },
    {
      label: "Rechazadas",
      value: stats?.rechazadas ?? 0,
      color: "bg-red-500",
      icon: "❌",
    },
  ];

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Resumen de facturación electrónica"
        action={
          <Link href="/dashboard/invoices/new">
            <Button>+ Nueva Factura</Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {loading ? "—" : card.value}
                </p>
              </div>
              <div
                className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-2xl`}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Últimas Facturas</h2>
          <Link href="/dashboard/invoices" className="text-sm text-blue-600 hover:underline">
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-4">No hay facturas aún</p>
            <Link href="/dashboard/invoices/new">
              <Button size="sm">Crear primera factura</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                <th className="px-6 py-3">Número</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-sm text-gray-900">
                    {inv.secuencial}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {inv.client.razonSocial}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {new Date(inv.fechaEmision).toLocaleDateString("es-EC")}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-right text-gray-900">
                    ${Number(inv.importeTotal).toFixed(2)}
                  </td>
                  <td className="px-6 py-3">
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
