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

  useEffect(() => { load(); }, [estado, search]);

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
    <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
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
      <div className="flex gap-3 mb-6">
        <input
          className="flex-1 max-w-xs px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-colors"
          style={{
            background: "var(--surface-white)",
            color: "var(--text-base)",
            border: "2px solid var(--border-subtle)",
          }}
          placeholder="Buscar por número o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        />
        <select
          className="px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-colors"
          style={{
            background: "var(--surface-white)",
            color: "var(--text-base)",
            border: "2px solid var(--border-subtle)",
          }}
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        >
          {ESTADO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-white)" }}>
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : !data || data.items.length === 0 ? (
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
            <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>Sin facturas</p>
            <p className="text-[11px] font-medium mb-5" style={{ color: "var(--text-muted)" }}>
              Empiece creando su primer comprobante electrónico
            </p>
            <Link href="/invoices/new">
              <Button size="sm">Crear primera factura</Button>
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--surface-low)" }}>
                  {["Número", "Cliente", "Fecha", "Total", "Ambiente", "Estado", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[9px] font-bold tracking-[0.15em] uppercase
                        ${h === "Total" || h === "" ? "text-right"
                          : h === "Ambiente" || h === "Estado" ? "text-center"
                          : "text-left"}`}
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    style={{ background: idx % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                  >
                    <td className="px-4 py-3.5 font-mono text-sm font-semibold" style={{ color: "var(--text-base)" }}>
                      #{inv.secuencial}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="font-bold" style={{ color: "var(--text-base)" }}>{inv.client.razonSocial}</div>
                      <div className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{inv.client.identificacion}</div>
                    </td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: "var(--text-muted)" }}>
                      {new Date(inv.fechaEmision).toLocaleDateString("es-EC")}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-right" style={{ color: "var(--text-base)" }}>
                      ${Number(inv.importeTotal).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge estado={inv.ambiente}>{inv.ambiente}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge estado={inv.estado}>{inv.estado}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        {(inv.estado === "PENDIENTE" || inv.estado === "RECHAZADO") && (
                          <Button
                            size="sm"
                            loading={processing === inv.id}
                            onClick={() => handleSendToSRI(inv.id)}
                          >
                            Enviar SRI
                          </Button>
                        )}
                        {inv.estado === "AUTORIZADO" && (
                          <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer">
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
            <div
              className="px-4 py-3 text-[10px] font-bold tracking-widest uppercase"
              style={{
                borderTop: "1px solid var(--surface-highest)",
                color: "var(--text-muted)",
              }}
            >
              {data.total} comprobante{data.total !== 1 ? "s" : ""} en total
            </div>
          </>
        )}
      </div>
    </div>
  );
}
