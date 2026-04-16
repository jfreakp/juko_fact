"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface InvoiceDetail {
  id: string;
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
  tipoIva: string;
  valorIva: number;
}

interface InvoiceData {
  id: string;
  secuencial: string;
  claveAcceso: string | null;
  numeroAutorizacion: string | null;
  fechaAutorizacion: string | null;
  fechaEmision: string;
  estado: string;
  ambiente: string;
  importeTotal: number;
  subtotal0: number;
  subtotal12: number;
  totalIva: number;
  totalDescuento: number;
  xmlFirmado: string | null;
  xmlAutorizado: string | null;
  observaciones: string | null;
  company: { ruc: string; razonSocial: string; dirMatriz: string; estab: string; ptoEmi: string };
  client: { razonSocial: string; identificacion: string; email: string | null };
  details: InvoiceDetail[];
  sriResponses: { id: string; tipo: string; estado: string; mensaje: string | null; rawResponse: string | null; createdAt: string }[];
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  async function load() {
    const res = await fetch(`/api/invoices/${id}`);
    const data = await res.json();
    if (data.success) setInvoice(data.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function sendToSRI() {
    setProcessing(true);
    try {
      const res = await fetch("/api/sri/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      success("Procesado: " + data.data.estado);
      load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
        <p className="text-sm font-bold" style={{ color: "var(--error-text)" }}>Factura no encontrada</p>
      </div>
    );
  }

  const serie = `${invoice.company.estab}-${invoice.company.ptoEmi}-${invoice.secuencial}`;

  return (
    <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
      <Header
        title={`Factura ${serie}`}
        subtitle={`Comprobante electrónico — ${invoice.ambiente}`}
        action={
          <div className="flex gap-2">
            {(invoice.estado === "PENDIENTE" || invoice.estado === "RECHAZADO") && (
              <Button onClick={sendToSRI} loading={processing}>Enviar al SRI</Button>
            )}
            {invoice.estado === "AUTORIZADO" && (
              <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noreferrer">
                <Button variant="secondary">Ver RIDE</Button>
              </a>
            )}
            <Button variant="ghost" onClick={() => router.back()}>← Volver</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          {/* Info card */}
          <div className="rounded-xl p-6" style={{ background: "var(--surface-white)" }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>Estado</p>
                <Badge estado={invoice.estado}>{invoice.estado}</Badge>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>Fecha Emisión</p>
                <p className="text-sm font-bold" style={{ color: "var(--text-base)" }}>
                  {new Date(invoice.fechaEmision).toLocaleDateString("es-EC")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>Empresa Emisora</p>
                <p className="text-sm font-bold" style={{ color: "var(--text-base)" }}>{invoice.company.razonSocial}</p>
                <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>RUC: {invoice.company.ruc}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>Cliente</p>
                <p className="text-sm font-bold" style={{ color: "var(--text-base)" }}>{invoice.client.razonSocial}</p>
                <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{invoice.client.identificacion}</p>
                {invoice.client.email && (
                  <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{invoice.client.email}</p>
                )}
              </div>
            </div>

            {invoice.claveAcceso && (
              <div
                className="mt-5 p-3 rounded-lg"
                style={{ background: "var(--surface-low)" }}
              >
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>
                  Clave de Acceso
                </p>
                <p className="font-mono text-[11px] break-all" style={{ color: "var(--text-secondary)" }}>
                  {invoice.claveAcceso}
                </p>
              </div>
            )}

            {invoice.numeroAutorizacion && (
              <div
                className="mt-3 p-3 rounded-lg"
                style={{ background: "var(--success-bg)", border: "1px solid var(--success-text)" }}
              >
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: "var(--success-text)", opacity: 0.7 }}>
                  Número de Autorización
                </p>
                <p className="font-mono text-[11px] break-all font-bold" style={{ color: "var(--success-text)" }}>
                  {invoice.numeroAutorizacion}
                </p>
                {invoice.fechaAutorizacion && (
                  <p className="text-[10px] mt-1" style={{ color: "var(--success-text)", opacity: 0.7 }}>
                    {new Date(invoice.fechaAutorizacion).toLocaleString("es-EC")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Details table */}
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-white)" }}>
            <div
              className="px-6 py-4"
              style={{ borderBottom: "1px solid var(--surface-highest)" }}
            >
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
                Detalles
              </p>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--surface-low)" }}>
                  {["Código", "Descripción", "Cant.", "P. Unit.", "Subtotal", "IVA"].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[9px] font-bold tracking-[0.15em] uppercase
                        ${["Cant.", "P. Unit.", "Subtotal", "IVA"].includes(h) ? "text-right" : "text-left"}`}
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.details.map((d, idx) => (
                  <tr key={d.id} style={{ background: idx % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}>
                    <td className="px-4 py-3 font-mono text-[11px] font-semibold" style={{ color: "var(--text-base)" }}>
                      {d.codigoPrincipal}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-base)" }}>{d.descripcion}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: "var(--text-base)" }}>{Number(d.cantidad).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: "var(--text-base)" }}>${Number(d.precioUnitario).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-right" style={{ color: "var(--text-base)" }}>${Number(d.precioTotalSinImpuesto).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: "var(--text-base)" }}>${Number(d.valorIva).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SRI history */}
          {invoice.sriResponses.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-white)" }}>
              <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--surface-highest)" }}>
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
                  Historial SRI
                </p>
              </div>
              <div>
                {invoice.sriResponses.map((r, idx) => (
                  <SRIResponseRow key={r.id} r={r} idx={idx} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: totals */}
        <div className="space-y-4">
          <div className="rounded-xl p-6" style={{ background: "var(--surface-white)" }}>
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--text-muted)" }}>
              Totales
            </p>
            <div className="space-y-3 text-sm">
              {[
                { label: "Subtotal 0%", value: `$${Number(invoice.subtotal0).toFixed(2)}` },
                { label: "Subtotal 12%", value: `$${Number(invoice.subtotal12).toFixed(2)}` },
                { label: "Descuento", value: `-$${Number(invoice.totalDescuento).toFixed(2)}` },
                { label: "IVA", value: `$${Number(invoice.totalIva).toFixed(2)}` },
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                  <span className="font-semibold" style={{ color: "var(--text-base)" }}>{row.value}</span>
                </div>
              ))}
              <div
                className="flex justify-between pt-3 mt-1"
                style={{ borderTop: "2px solid var(--surface-highest)" }}
              >
                <span className="font-black text-sm tracking-widest uppercase" style={{ color: "var(--text-base)" }}>
                  Total
                </span>
                <span className="font-black text-lg" style={{ color: "var(--primary-focus)" }}>
                  ${Number(invoice.importeTotal).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {(invoice.xmlFirmado || invoice.xmlAutorizado) && (
            <div className="rounded-xl p-6" style={{ background: "var(--surface-white)" }}>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--text-muted)" }}>
                Archivos XML
              </p>
              <div className="space-y-2">
                {invoice.xmlFirmado && (
                  <a
                    href={`data:text/xml;charset=utf-8,${encodeURIComponent(invoice.xmlFirmado)}`}
                    download={`factura-firmada-${invoice.secuencial}.xml`}
                    className="flex items-center gap-2 text-sm font-bold transition-colors"
                    style={{ color: "var(--primary-focus)" }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    XML Firmado
                  </a>
                )}
                {invoice.xmlAutorizado && (
                  <a
                    href={`data:text/xml;charset=utf-8,${encodeURIComponent(invoice.xmlAutorizado)}`}
                    download={`factura-autorizada-${invoice.secuencial}.xml`}
                    className="flex items-center gap-2 text-sm font-bold transition-colors"
                    style={{ color: "var(--success-text)" }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    XML Autorizado
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SRI Response Row ─────────────────────────────────────────────────────────

function SRIResponseRow({
  r,
  idx,
}: {
  r: { id: string; tipo: string; estado: string; mensaje: string | null; rawResponse: string | null; createdAt: string };
  idx: number;
}) {
  const [open, setOpen] = useState(false);
  const isOk = r.estado === "RECIBIDA" || r.estado === "AUTORIZADA";

  return (
    <div
      style={{ background: idx % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
    >
      {/* Row header */}
      <div className="px-6 py-3 flex items-center gap-4">
        <span
          className="text-[9px] font-bold tracking-widest uppercase w-24 flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {r.tipo}
        </span>
        <Badge estado={isOk ? "AUTORIZADO" : r.estado}>{r.estado}</Badge>
        {r.mensaje && (
          <span className="text-[11px] flex-1 min-w-0 truncate" style={{ color: "var(--text-secondary)" }}>
            {r.mensaje}
          </span>
        )}
        <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
          {new Date(r.createdAt).toLocaleString("es-EC")}
        </span>
        {r.rawResponse && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex-shrink-0 text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded"
            style={{
              background: open ? "var(--surface-highest)" : "var(--surface-low)",
              color: "var(--text-muted)",
            }}
          >
            {open ? "Ocultar" : "Ver XML"}
          </button>
        )}
      </div>

      {/* Raw response expandable */}
      {open && r.rawResponse && (
        <div
          className="mx-6 mb-3 rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--surface-highest)" }}
        >
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ background: "var(--surface-low)", borderBottom: "1px solid var(--surface-highest)" }}
          >
            <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Respuesta RAW del SRI
            </span>
            <button
              onClick={() => navigator.clipboard?.writeText(r.rawResponse!)}
              className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded"
              style={{ background: "var(--surface-highest)", color: "var(--text-muted)" }}
            >
              Copiar
            </button>
          </div>
          <pre
            className="p-3 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all"
            style={{ color: "var(--text-secondary)", maxHeight: "320px", overflowY: "auto" }}
          >
            {r.rawResponse}
          </pre>
        </div>
      )}
    </div>
  );
}
