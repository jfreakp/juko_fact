"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface Invoice {
  id: string;
  secuencial: string;
  client: { razonSocial: string; identificacion: string };
  importeTotal: number;
  estado: string;
  fechaEmision: string;
  claveAcceso: string | null;
  numeroAutorizacion: string | null;
  ambiente: string;
}

interface PageData {
  items: Invoice[];
  total: number;
  page: number;
  limit: number;
}

const ESTADO_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "ENVIADO", label: "Enviado" },
  { value: "AUTORIZADO", label: "Autorizado" },
  { value: "RECHAZADO", label: "Rechazado" },
];

export default function InvoicesPage() {
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState("");
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    if (search) params.set("search", search);

    const res = await fetch(`/api/invoices?${params}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [estado, search]);

  async function handleSendToSRI(id: string) {
    setProcessing(id);
    try {
      const res = await fetch("/api/sri/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const r = data.data;
      if (r.estado === "AUTORIZADA" || r.estado === "AUTORIZADO") {
        success(`Factura autorizada: ${r.numeroAutorizacion}`);
      } else {
        toastError(`Estado: ${r.estado}. ${r.mensaje ?? ""}`);
      }
      load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al enviar al SRI");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <Header
        title="Facturas"
        subtitle="Gestión de comprobantes electrónicos"
        action={
          <Link href="/invoices/new">
            <Button>+ Nueva Factura</Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <input
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-xs"
          placeholder="Buscar por número o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          {ESTADO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-3">No hay facturas</p>
            <Link href="/invoices/new">
              <Button size="sm">Crear primera factura</Button>
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Ambiente</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {inv.secuencial}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{inv.client.razonSocial}</div>
                      <div className="text-gray-400 text-xs">{inv.client.identificacion}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(inv.fechaEmision).toLocaleDateString("es-EC")}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                      ${Number(inv.importeTotal).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge estado={inv.ambiente}>{inv.ambiente}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge estado={inv.estado}>{inv.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {(inv.estado === "PENDIENTE" || inv.estado === "RECHAZADO") && (
                          <Button
                            size="sm"
                            variant="primary"
                            loading={processing === inv.id}
                            onClick={() => handleSendToSRI(inv.id)}
                          >
                            Enviar SRI
                          </Button>
                        )}
                        {inv.estado === "AUTORIZADO" && (
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button size="sm" variant="secondary">RIDE</Button>
                          </a>
                        )}
                        <Link href={`/invoices/${inv.id}`}>
                          <Button size="sm" variant="ghost">Ver</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t text-xs text-gray-500">
              {data.total} comprobante{data.total !== 1 ? "s" : ""} en total
            </div>
          </>
        )}
      </div>
    </div>
  );
}
