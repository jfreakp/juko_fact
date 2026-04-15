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
  sriResponses: { id: string; tipo: string; estado: string; mensaje: string | null; createdAt: string }[];
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

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">Factura no encontrada</div>;

  const serie = `${invoice.company.estab}-${invoice.company.ptoEmi}-${invoice.secuencial}`;

  return (
    <div>
      <Header
        title={`Factura ${serie}`}
        subtitle={`Comprobante electrónico — ${invoice.ambiente}`}
        action={
          <div className="flex gap-3">
            {(invoice.estado === "PENDIENTE" || invoice.estado === "RECHAZADO") && (
              <Button onClick={sendToSRI} loading={processing}>
                Enviar al SRI
              </Button>
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
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <Badge estado={invoice.estado}>{invoice.estado}</Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Fecha Emisión</p>
                <p className="font-medium">{new Date(invoice.fechaEmision).toLocaleDateString("es-EC")}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Empresa Emisora</p>
                <p className="font-medium">{invoice.company.razonSocial}</p>
                <p className="text-gray-400">RUC: {invoice.company.ruc}</p>
              </div>
              <div>
                <p className="text-gray-500">Cliente</p>
                <p className="font-medium">{invoice.client.razonSocial}</p>
                <p className="text-gray-400">{invoice.client.identificacion}</p>
                {invoice.client.email && <p className="text-gray-400">{invoice.client.email}</p>}
              </div>
            </div>

            {invoice.claveAcceso && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Clave de Acceso</p>
                <p className="font-mono text-xs break-all">{invoice.claveAcceso}</p>
              </div>
            )}

            {invoice.numeroAutorizacion && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">Número de Autorización</p>
                <p className="font-mono text-xs break-all text-green-800">{invoice.numeroAutorizacion}</p>
                {invoice.fechaAutorizacion && (
                  <p className="text-xs text-green-600 mt-1">
                    {new Date(invoice.fechaAutorizacion).toLocaleString("es-EC")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Detalles</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Cant.</th>
                  <th className="px-4 py-3 text-right">P. Unit.</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-right">IVA</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.details.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-mono text-xs">{d.codigoPrincipal}</td>
                    <td className="px-4 py-3">{d.descripcion}</td>
                    <td className="px-4 py-3 text-right">{Number(d.cantidad).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${Number(d.precioUnitario).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${Number(d.precioTotalSinImpuesto).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${Number(d.valorIva).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SRI Responses */}
          {invoice.sriResponses.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="font-semibold text-gray-900">Historial SRI</h3>
              </div>
              <div className="divide-y">
                {invoice.sriResponses.map((r) => (
                  <div key={r.id} className="px-6 py-3 flex items-center gap-4">
                    <span className="text-xs font-medium text-gray-500 w-24">{r.tipo}</span>
                    <Badge estado={r.estado === "RECIBIDA" || r.estado === "AUTORIZADA" ? "AUTORIZADO" : r.estado}>
                      {r.estado}
                    </Badge>
                    {r.mensaje && <span className="text-xs text-gray-600">{r.mensaje}</span>}
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(r.createdAt).toLocaleString("es-EC")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: totals */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Totales</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal 0%</span>
                <span>${Number(invoice.subtotal0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal 12%</span>
                <span>${Number(invoice.subtotal12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Descuento</span>
                <span>-${Number(invoice.totalDescuento).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IVA</span>
                <span>${Number(invoice.totalIva).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>TOTAL</span>
                <span className="text-blue-600">${Number(invoice.importeTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* XML download links */}
          {(invoice.xmlFirmado || invoice.xmlAutorizado) && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Archivos XML</h3>
              <div className="space-y-2">
                {invoice.xmlFirmado && (
                  <a
                    href={`data:text/xml;charset=utf-8,${encodeURIComponent(invoice.xmlFirmado)}`}
                    download={`factura-firmada-${invoice.secuencial}.xml`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    📄 XML Firmado
                  </a>
                )}
                {invoice.xmlAutorizado && (
                  <a
                    href={`data:text/xml;charset=utf-8,${encodeURIComponent(invoice.xmlAutorizado)}`}
                    download={`factura-autorizada-${invoice.secuencial}.xml`}
                    className="flex items-center gap-2 text-sm text-green-600 hover:underline"
                  >
                    ✅ XML Autorizado
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
