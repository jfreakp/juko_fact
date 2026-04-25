"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseItem {
  id: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  product: { id: string; codigoPrincipal: string; descripcion: string; unidadMedida: string } | null;
}

interface Purchase {
  id: string;
  fechaCompra: string;
  tipoDocumento: string;
  numeroDocumento: string | null;
  subtotal: number;
  iva: number;
  total: number;
  notas: string | null;
  supplier: { id: string; nombre: string; ruc: string | null; email: string | null; telefono: string | null } | null;
  branch: { id: string; nombre: string };
  user: { id: string; name: string };
  items: PurchaseItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  FACTURA: "Factura",
  NOTA_ENTREGA: "Nota de Entrega",
  LIQUIDACION_COMPRA: "Liquidación de Compra",
  OTRO: "Otro",
};

function fmt(n: number) {
  return n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/purchases/${id}`)
      .then((r) => r.json())
      .then((r) => { setPurchase(r.data); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Detalle de Compra" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Detalle de Compra" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Compra no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={`Compra — ${purchase.numeroDocumento ?? purchase.id.slice(0, 8)}`} />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Meta */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--surface-low)" }}>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>Tipo de Documento</p>
                <p style={{ color: "var(--text-base)" }}>{TIPO_LABEL[purchase.tipoDocumento]}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>N° Documento</p>
                <p style={{ color: "var(--text-base)" }}>{purchase.numeroDocumento ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>Fecha de Compra</p>
                <p style={{ color: "var(--text-base)" }}>{new Date(purchase.fechaCompra).toLocaleDateString("es-EC")}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>Sucursal</p>
                <p style={{ color: "var(--text-base)" }}>{purchase.branch.nombre}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>Registrado por</p>
                <p style={{ color: "var(--text-base)" }}>{purchase.user.name}</p>
              </div>
              {purchase.supplier && (
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>Proveedor</p>
                  <p style={{ color: "var(--text-base)" }}>{purchase.supplier.nombre}</p>
                  {purchase.supplier.ruc && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>RUC: {purchase.supplier.ruc}</p>}
                </div>
              )}
              {purchase.notas && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>Notas</p>
                  <p style={{ color: "var(--text-secondary)" }}>{purchase.notas}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--surface-highest)" }}>
            <table className="w-full text-xs">
              <thead style={{ background: "var(--surface-low)" }}>
                <tr>
                  {["Código", "Descripción", "Cantidad", "Costo Unit.", "Total"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)", fontSize: "10px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid var(--surface-highest)" }}>
                    <td className="px-4 py-3 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {item.product?.codigoPrincipal ?? "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-base)" }}>{item.descripcion}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                      {Number(item.cantidad).toFixed(2)} {item.product?.unidadMedida ?? ""}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>$ {fmt(Number(item.costoUnitario))}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: "var(--text-base)" }}>$ {fmt(Number(item.costoTotal))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: "var(--surface-low)", borderTop: "2px solid var(--surface-highest)" }}>
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-bold tracking-widest uppercase text-[10px]" style={{ color: "var(--text-muted)" }}>Total</td>
                  <td className="px-4 py-3 font-black text-base" style={{ color: "var(--text-base)" }}>$ {fmt(Number(purchase.total))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-start">
            <Button variant="ghost" onClick={() => router.push("/purchases")}>← Volver</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
