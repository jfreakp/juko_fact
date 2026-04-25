"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Link from "next/link";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface StockRow {
  id: string;
  cantidad: string;
  stockMinimo: string;
  inventoryProduct: {
    id: string;
    costoPromedio: string;
    product: {
      id: string;
      codigoPrincipal: string;
      descripcion: string;
      tipo: string;
    };
  };
  branch: { id: string; nombre: string };
}

interface InvProduct {
  id: string;
  codigoPrincipal: string;
  descripcion: string;
}

interface Branch {
  id: string;
  nombre: string;
}

const emptyAdjForm = {
  productId: "",
  branchId: "",
  cantidad: "",
  costoUnitario: "",
  notas: "",
};

// ─── Página ───────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { user } = useCurrentUser();
  const { success, error: toastError } = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState("");

  const [adjOpen, setAdjOpen] = useState(false);
  const [adjForm, setAdjForm] = useState(emptyAdjForm);
  const [adjSaving, setAdjSaving] = useState(false);

  const [invProducts, setInvProducts] = useState<InvProduct[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Edición inline de stockMinimo
  const [editingMinId, setEditingMinId] = useState<string | null>(null);
  const [editingMinVal, setEditingMinVal] = useState("");
  const minInputRef = useRef<HTMLInputElement>(null);

  async function saveStockMinimo(row: StockRow) {
    const val = parseFloat(editingMinVal);
    if (isNaN(val) || val < 0) { setEditingMinId(null); return; }
    // No cambió
    if (val === Number(row.stockMinimo)) { setEditingMinId(null); return; }

    try {
      const res = await fetch(`/api/inventory/products/${row.inventoryProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockMinimo: val }),
      });
      if (res.ok) {
        // Actualiza local para no hacer un refetch completo
        setStock((prev) =>
          prev.map((s) =>
            s.id === row.id ? { ...s, stockMinimo: String(val) } : s
          )
        );
        success("Mínimo actualizado");
      } else {
        toastError("Error al guardar");
      }
    } catch {
      toastError("Error de conexión");
    } finally {
      setEditingMinId(null);
    }
  }

  function startEditMin(row: StockRow) {
    setEditingMinId(row.id);
    setEditingMinVal(Number(row.stockMinimo).toFixed(2));
    setTimeout(() => minInputRef.current?.select(), 30);
  }

  async function loadStock() {
    setLoading(true);
    const url = filterBranch
      ? `/api/inventory/stock?branchId=${filterBranch}`
      : "/api/inventory/stock";
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) setStock(data.data);
    setLoading(false);
  }

  async function loadMeta() {
    const [invRes, branchRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/branches"),
    ]);
    const invData = await invRes.json();
    const branchData = await branchRes.json();
    if (invData.success) setInvProducts(invData.data.filter((p: InvProduct & { tipo: string }) => p.tipo === "BIEN"));
    if (branchData.success) setBranches(branchData.data);
  }

  useEffect(() => { loadStock(); }, [filterBranch]);
  useEffect(() => { if (isAdmin) loadMeta(); }, [isAdmin]);

  async function handleAdjustment(e: FormEvent) {
    e.preventDefault();
    setAdjSaving(true);
    try {
      const res = await fetch("/api/inventory/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId:     adjForm.productId,
          branchId:      adjForm.branchId,
          cantidad:      parseFloat(adjForm.cantidad),
          costoUnitario: parseFloat(adjForm.costoUnitario),
          notas:         adjForm.notas || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      success("Ajuste registrado correctamente");
      setAdjOpen(false);
      setAdjForm(emptyAdjForm);
      loadStock();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al registrar ajuste");
    } finally {
      setAdjSaving(false);
    }
  }

  const alerts = stock.filter(
    (s) => Number(s.cantidad) <= Number(s.stockMinimo)
  );

  const branchOptions = [
    { value: "", label: "Todas las sucursales" },
    ...branches.map((b) => ({ value: b.id, label: b.nombre })),
  ];

  const invProductOptions = invProducts.map((p) => ({
    value: p.id,
    label: `[${p.codigoPrincipal}] ${p.descripcion}`,
  }));

  const branchSelectOptions = branches.map((b) => ({ value: b.id, label: b.nombre }));

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--surface)" }}>
      <Header
        title="Inventario"
        subtitle="Control de stock por producto y sucursal"
        action={
          <div className="flex items-center gap-3">
            <Link href="/inventory/kardex">
              <Button variant="ghost" size="sm">Kardex</Button>
            </Link>
            {isAdmin && (
              <Button onClick={() => setAdjOpen(true)}>+ Ajuste</Button>
            )}
          </div>
        }
      />

      {/* Alertas de stock bajo */}
      {alerts.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-6" style={{ border: "2px solid var(--warning-bg)" }}>
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs font-black tracking-widest uppercase">
              {alerts.length} producto{alerts.length !== 1 ? "s" : ""} bajo el mínimo — requiere reabastecimiento
            </p>
          </div>
          {/* Tabla */}
          <table className="w-full text-xs" style={{ background: "var(--surface-low)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--surface-highest)" }}>
                {["Código", "Producto", "Sucursal", "Stock actual", "Mínimo", "Déficit"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-bold tracking-widest uppercase text-[10px]"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const actual = Number(a.cantidad);
                const minimo = Number(a.stockMinimo);
                const deficit = minimo - actual;
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--surface-highest)" }}>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {a.inventoryProduct.product.codigoPrincipal}
                    </td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: "var(--text-base)" }}>
                      {a.inventoryProduct.product.descripcion}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text-secondary)" }}>
                      {a.branch.nombre}
                    </td>
                    <td className="px-4 py-2.5 font-black tabular-nums" style={{ color: "var(--error-strong)" }}>
                      {actual.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {minimo.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 font-bold tabular-nums" style={{ color: "var(--warning-text)" }}>
                      +{deficit.toFixed(2)} necesarios
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Filtro de sucursal */}
      <div className="mb-4 max-w-xs">
        <Select
          options={branchOptions}
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          placeholder="Todas las sucursales"
        />
      </div>

      {/* Tabla de stock */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--surface-white)", border: "2px solid var(--border-subtle)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--surface-low)" }}>
              {["Código", "Producto", "Tipo", "Sucursal", "Stock", "Mín.", "Costo Prom.", "Estado"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-[9px] font-bold tracking-[0.15em] uppercase"
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="skeleton h-4 rounded" style={{ width: `${60 + j * 10}px` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : stock.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div
                    className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "var(--surface-low)" }}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={1.5}
                         style={{ color: "var(--text-muted)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>
                    Sin productos en inventario
                  </p>
                  <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
                    Activa el control de stock en la configuración de cada producto
                  </p>
                </td>
              </tr>
            ) : (
              stock.map((row, i) => {
                const isLow = Number(row.cantidad) <= Number(row.stockMinimo);
                return (
                  <tr
                    key={row.id}
                    style={{ background: i % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold"
                        style={{ color: "var(--text-muted)" }}>
                      {row.inventoryProduct.product.codigoPrincipal}
                    </td>
                    <td className="px-5 py-3.5 font-bold" style={{ color: "var(--text-base)" }}>
                      {row.inventoryProduct.product.descripcion}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={row.inventoryProduct.product.tipo === "SERVICIO" ? "purple" : "info"}>
                        {row.inventoryProduct.product.tipo}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      {row.branch.nombre}
                    </td>
                    <td
                      className="px-5 py-3.5 font-black text-base tabular-nums"
                      style={{ color: isLow ? "var(--error-text)" : "var(--text-base)" }}
                    >
                      {Number(row.cantidad).toFixed(2)}
                    </td>
                    <td className="px-2 py-2">
                      {editingMinId === row.id ? (
                        <input
                          ref={minInputRef}
                          type="number"
                          min="0"
                          step="1"
                          value={editingMinVal}
                          onChange={(e) => setEditingMinVal(e.target.value)}
                          onBlur={() => saveStockMinimo(row)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveStockMinimo(row);
                            if (e.key === "Escape") setEditingMinId(null);
                          }}
                          className="w-20 px-2 py-1 rounded text-xs tabular-nums text-center font-bold"
                          style={{
                            background: "var(--surface-high)",
                            color: "var(--text-base)",
                            border: "2px solid var(--primary)",
                            outline: "none",
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => startEditMin(row)}
                          title="Clic para editar el stock mínimo"
                          className="px-3 py-1 rounded text-xs tabular-nums font-bold transition-colors w-full text-left"
                          style={{ color: "var(--text-muted)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "var(--surface-high)";
                            (e.currentTarget as HTMLElement).style.color = "var(--text-base)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                          }}
                        >
                          {Number(row.stockMinimo).toFixed(2)}
                          <span className="ml-1 text-[9px] opacity-50">✎</span>
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs tabular-nums font-mono"
                        style={{ color: "var(--text-muted)" }}>
                      ${Number(row.inventoryProduct.costoPromedio).toFixed(4)}
                    </td>
                    <td className="px-5 py-3.5">
                      {isLow ? (
                        <Badge variant="danger">Stock bajo</Badge>
                      ) : (
                        <Badge variant="success">Normal</Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de ajuste */}
      {isAdmin && (
        <Modal
          open={adjOpen}
          onClose={() => { setAdjOpen(false); setAdjForm(emptyAdjForm); }}
          title="Ajuste de Inventario"
        >
          <form onSubmit={handleAdjustment} className="space-y-4">
            <Select
              label="Producto"
              options={invProductOptions}
              value={adjForm.productId}
              onChange={(e) => setAdjForm({ ...adjForm, productId: e.target.value })}
              placeholder="Seleccionar producto..."
              required
            />
            <Select
              label="Sucursal"
              options={branchSelectOptions}
              value={adjForm.branchId}
              onChange={(e) => setAdjForm({ ...adjForm, branchId: e.target.value })}
              placeholder="Seleccionar sucursal..."
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Cantidad (+ entrada / - salida)"
                type="number"
                step="0.01"
                value={adjForm.cantidad}
                onChange={(e) => setAdjForm({ ...adjForm, cantidad: e.target.value })}
                required
                placeholder="Ej: 10 o -5"
              />
              <Input
                label="Costo Unitario (USD)"
                type="number"
                step="0.0001"
                min="0"
                value={adjForm.costoUnitario}
                onChange={(e) => setAdjForm({ ...adjForm, costoUnitario: e.target.value })}
                required
                placeholder="0.0000"
              />
            </div>
            <Input
              label="Notas (opcional)"
              value={adjForm.notas}
              onChange={(e) => setAdjForm({ ...adjForm, notas: e.target.value })}
              placeholder="Razón del ajuste..."
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => { setAdjOpen(false); setAdjForm(emptyAdjForm); }}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={adjSaving}>
                Confirmar Ajuste
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
