"use client";

import { useEffect, useState, FormEvent } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Transfer {
  id: string;
  createdAt: string;
  fromBranch: { nombre: string };
  toBranch: { nombre: string };
  user: { name: string };
  notas: string | null;
  items: Array<{
    cantidad: string;
    costoUnitario: string;
    inventoryProduct: {
      product: { codigoPrincipal: string; descripcion: string };
    };
  }>;
}

interface InvProduct {
  id: string;
  product: { id: string; codigoPrincipal: string; descripcion: string };
}

interface Branch {
  id: string;
  nombre: string;
}

interface TransferItem {
  productId: string;
  cantidad: string;
  costoUnitario: string;
}

const emptyItem: TransferItem = { productId: "", cantidad: "", costoUnitario: "" };

// ─── Página ───────────────────────────────────────────────────────────────────

export default function TransfersPage() {
  const { success, error: toastError } = useToast();

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<TransferItem[]>([{ ...emptyItem }]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [invProducts, setInvProducts] = useState<InvProduct[]>([]);

  async function loadTransfers() {
    setLoading(true);
    const res = await fetch("/api/inventory/transfer");
    const data = await res.json();
    if (data.success) setTransfers(data.data);
    setLoading(false);
  }

  async function loadMeta() {
    const [branchRes, invRes] = await Promise.all([
      fetch("/api/branches"),
      fetch("/api/inventory/products"),
    ]);
    const bd = await branchRes.json();
    const id = await invRes.json();
    if (bd.success) setBranches(bd.data);
    if (id.success) setInvProducts(id.data);
  }

  useEffect(() => { loadTransfers(); loadMeta(); }, []);

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof TransferItem, value: string) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function resetForm() {
    setFromBranchId("");
    setToBranchId("");
    setNotas("");
    setItems([{ ...emptyItem }]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBranchId,
          toBranchId,
          notas: notas || undefined,
          items: items.map((item) => ({
            productId:     item.productId,
            cantidad:      parseFloat(item.cantidad),
            costoUnitario: parseFloat(item.costoUnitario),
          })),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      success("Transferencia realizada correctamente");
      setModalOpen(false);
      resetForm();
      loadTransfers();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al crear transferencia");
    } finally {
      setSaving(false);
    }
  }

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.nombre }));
  const invProductOptions = invProducts.map((p) => ({
    value: p.product.id,
    label: `[${p.product.codigoPrincipal}] ${p.product.descripcion}`,
  }));

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--surface)" }}>
      <Header
        title="Transferencias"
        subtitle="Movimiento de stock entre sucursales"
        action={
          <div className="flex gap-3">
            <Link href="/inventory">
              <Button variant="ghost" size="sm">← Stock</Button>
            </Link>
            <Button onClick={() => setModalOpen(true)}>+ Nueva Transferencia</Button>
          </div>
        }
      />

      {/* Lista de transferencias */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 skeleton h-20" />
          ))
        ) : transfers.length === 0 ? (
          <div
            className="rounded-xl p-16 text-center"
            style={{ background: "var(--surface-white)", border: "2px solid var(--border-subtle)" }}
          >
            <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>
              Sin transferencias
            </p>
            <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
              Crea una transferencia para mover stock entre sucursales
            </p>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              Primera transferencia
            </Button>
          </div>
        ) : (
          transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="rounded-xl p-5"
              style={{ background: "var(--surface-white)", border: "2px solid var(--border-subtle)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm" style={{ color: "var(--text-base)" }}>
                    {transfer.fromBranch.nombre}
                  </span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span className="font-bold text-sm" style={{ color: "var(--text-base)" }}>
                    {transfer.toBranch.nombre}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {new Date(transfer.createdAt).toLocaleString("es-EC", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    por {transfer.user.name}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {transfer.items.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase"
                    style={{ background: "var(--surface-mid)", color: "var(--text-muted)" }}
                  >
                    {item.inventoryProduct.product.codigoPrincipal} ×{Number(item.cantidad).toFixed(2)}
                  </span>
                ))}
              </div>
              {transfer.notas && (
                <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  {transfer.notas}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal nueva transferencia */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title="Nueva Transferencia"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Sucursal Origen"
              options={branchOptions}
              value={fromBranchId}
              onChange={(e) => setFromBranchId(e.target.value)}
              placeholder="Seleccionar..."
              required
            />
            <Select
              label="Sucursal Destino"
              options={branchOptions}
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              placeholder="Seleccionar..."
              required
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold tracking-widest uppercase"
                     style={{ color: "var(--text-secondary)" }}>
                Productos
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "var(--primary-focus)" }}
              >
                + Agregar
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-end">
                  <Select
                    options={invProductOptions}
                    value={item.productId}
                    onChange={(e) => updateItem(idx, "productId", e.target.value)}
                    placeholder="Producto..."
                    required
                  />
                  <Input
                    label={idx === 0 ? "Cant." : ""}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={item.cantidad}
                    onChange={(e) => updateItem(idx, "cantidad", e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <Input
                    label={idx === 0 ? "Costo" : ""}
                    type="number"
                    step="0.0001"
                    min="0"
                    value={item.costoUnitario}
                    onChange={(e) => updateItem(idx, "costoUnitario", e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="mb-0.5 w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
                    style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Notas (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => { setModalOpen(false); resetForm(); }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Confirmar Transferencia
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
