"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Link from "next/link";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface KardexItem {
  id: string;
  tipo: string;
  cantidad: string;
  costoUnitario: string;
  costoTotal: string;
  saldoResultante: string;
  referencia: string | null;
  notas: string | null;
  createdAt: string;
  inventoryProduct: {
    product: { codigoPrincipal: string; descripcion: string };
  };
  branch: { nombre: string };
  user: { name: string };
}

interface InvProduct {
  id: string;
  product: { id: string; codigoPrincipal: string; descripcion: string };
}

interface Branch {
  id: string;
  nombre: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  ENTRADA:          "Entrada",
  SALIDA:           "Salida",
  AJUSTE_POSITIVO:  "Ajuste +",
  AJUSTE_NEGATIVO:  "Ajuste -",
  TRANSFERENCIA_IN: "Transf. entrada",
  TRANSFERENCIA_OUT:"Transf. salida",
};

type BadgeVariant = "success" | "danger" | "warning" | "info" | "default" | "purple";

const TIPO_VARIANT: Record<string, BadgeVariant> = {
  ENTRADA:           "success",
  SALIDA:            "danger",
  AJUSTE_POSITIVO:   "info",
  AJUSTE_NEGATIVO:   "warning",
  TRANSFERENCIA_IN:  "success",
  TRANSFERENCIA_OUT: "warning",
};

// ─── Página ───────────────────────────────────────────────────────────────────

export default function KardexPage() {
  const [items, setItems] = useState<KardexItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [loading, setLoading] = useState(true);

  const [filterProduct, setFilterProduct] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [invProducts, setInvProducts] = useState<InvProduct[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  async function loadKardex() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterProduct) p.set("productId", filterProduct);
    if (filterBranch)  p.set("branchId",  filterBranch);
    if (filterFrom)    p.set("from",       filterFrom);
    if (filterTo)      p.set("to",         filterTo);
    p.set("page",  String(page));
    p.set("limit", String(limit));

    const res = await fetch(`/api/inventory/kardex?${p.toString()}`);
    const data = await res.json();
    if (data.success) {
      setItems(data.data.items);
      setTotal(data.data.total);
    }
    setLoading(false);
  }

  async function loadMeta() {
    const [invRes, branchRes] = await Promise.all([
      fetch("/api/inventory/products"),
      fetch("/api/branches"),
    ]);
    const invData = await invRes.json();
    const branchData = await branchRes.json();
    if (invData.success) setInvProducts(invData.data);
    if (branchData.success) setBranches(branchData.data);
  }

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadKardex(); }, [filterProduct, filterBranch, filterFrom, filterTo, page]);

  const invProductOptions = [
    { value: "", label: "Todos los productos" },
    ...invProducts.map((p) => ({
      value: p.product.id,
      label: `[${p.product.codigoPrincipal}] ${p.product.descripcion}`,
    })),
  ];

  const branchOptions = [
    { value: "", label: "Todas las sucursales" },
    ...branches.map((b) => ({ value: b.id, label: b.nombre })),
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--surface)" }}>
      <Header
        title="Kardex"
        subtitle="Historial de movimientos de inventario"
        action={
          <Link href="/inventory">
            <Button variant="ghost" size="sm">← Stock</Button>
          </Link>
        }
      />

      {/* Filtros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Select
          options={invProductOptions}
          value={filterProduct}
          onChange={(e) => { setFilterProduct(e.target.value); setPage(1); }}
          placeholder="Todos los productos"
        />
        <Select
          options={branchOptions}
          value={filterBranch}
          onChange={(e) => { setFilterBranch(e.target.value); setPage(1); }}
          placeholder="Todas las sucursales"
        />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold tracking-widest uppercase"
                 style={{ color: "var(--text-secondary)" }}>
            Desde
          </label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
            style={{
              background: "var(--surface-white)",
              color: "var(--text-base)",
              border: "2px solid var(--border-subtle)",
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold tracking-widest uppercase"
                 style={{ color: "var(--text-secondary)" }}>
            Hasta
          </label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
            style={{
              background: "var(--surface-white)",
              color: "var(--text-base)",
              border: "2px solid var(--border-subtle)",
            }}
          />
        </div>
      </div>

      {/* Tabla */}
      <div
        className="rounded-xl overflow-hidden mb-4"
        style={{ background: "var(--surface-white)", border: "2px solid var(--border-subtle)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--surface-low)" }}>
              {["Fecha", "Tipo", "Producto", "Sucursal", "Cantidad", "Costo Unit.", "Saldo", "Referencia", "Usuario"].map((h) => (
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
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="skeleton h-4 rounded" style={{ width: `${50 + j * 8}px` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>
                    Sin movimientos
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Ajusta los filtros para ver el historial
                  </p>
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr
                  key={item.id}
                  style={{ background: i % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                >
                  <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {new Date(item.createdAt).toLocaleString("es-EC", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={TIPO_VARIANT[item.tipo] ?? "default"}>
                      {TIPO_LABEL[item.tipo] ?? item.tipo}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-base)" }}>
                    {item.inventoryProduct.product.descripcion}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.branch.nombre}
                  </td>
                  <td className="px-4 py-3 font-bold tabular-nums"
                      style={{
                        color: ["SALIDA", "AJUSTE_NEGATIVO", "TRANSFERENCIA_OUT"].includes(item.tipo)
                          ? "var(--error-text)"
                          : "var(--success-text)",
                      }}>
                    {["SALIDA", "AJUSTE_NEGATIVO", "TRANSFERENCIA_OUT"].includes(item.tipo) ? "-" : "+"}
                    {Number(item.cantidad).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums font-mono"
                      style={{ color: "var(--text-muted)" }}>
                    ${Number(item.costoUnitario).toFixed(4)}
                  </td>
                  <td className="px-4 py-3 font-black tabular-nums" style={{ color: "var(--text-base)" }}>
                    {Number(item.saldoResultante).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                    {item.referencia ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.user.name}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {total} movimientos · Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
