"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier { id: string; nombre: string; ruc: string | null }
interface Branch { id: string; nombre: string }
interface Product { id: string; codigoPrincipal: string; descripcion: string; tipo: string; unidadMedida: string }

interface LineItem {
  productId: string;
  descripcion: string;
  cantidad: string;
  costoUnitario: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_DOC_OPTIONS = [
  { value: "FACTURA", label: "Factura" },
  { value: "NOTA_ENTREGA", label: "Nota de Entrega" },
  { value: "LIQUIDACION_COMPRA", label: "Liquidación de Compra" },
  { value: "OTRO", label: "Otro" },
];

const emptyLine = (): LineItem => ({ productId: "", descripcion: "", cantidad: "1", costoUnitario: "0" });

// ─── ProductPicker inline ─────────────────────────────────────────────────────

function ProductPicker({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (p: Product | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = products.filter(
    (p) =>
      p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      p.codigoPrincipal.toLowerCase().includes(search.toLowerCase())
  );

  function pick(p: Product) {
    onSelect(p);
    setSearch(p.descripcion);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar producto..."
        className="w-full px-3 py-2 rounded-lg text-xs"
        style={{ background: "var(--surface-high)", color: "var(--text-base)", border: "1px solid var(--surface-highest)", outline: "none" }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden shadow-lg max-h-48 overflow-y-auto" style={{ background: "var(--surface-low)", border: "1px solid var(--surface-highest)" }}>
          {filtered.slice(0, 20).map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => pick(p)}
              className="w-full px-3 py-2 text-left text-xs hover:opacity-80 flex items-center gap-2"
              style={{ color: "var(--text-base)" }}
            >
              <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>{p.codigoPrincipal}</span>
              <span className="truncate">{p.descripcion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewPurchasePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useCurrentUser();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("FACTURA");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  // Track which productId is selected per line (for stock movement)
  const [selectedProducts, setSelectedProducts] = useState<(Product | null)[]>([null]);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!user) return;

    fetch("/api/suppliers").then((r) => r.json()).then((r) => setSuppliers(r.data ?? []));
    fetch("/api/products?tipo=BIEN").then((r) => r.json()).then((r) => setProducts(r.data ?? []));

    if (isAdmin) {
      // Admins see the full branch list
      fetch("/api/branches").then((r) => r.json()).then((r) => {
        const list = r.data ?? [];
        setBranches(list);
        if (!branchId && list.length === 1) setBranchId(list[0].id);
      });
    } else {
      // Non-admins are locked to their own branch
      if (user.branch) {
        setBranches([user.branch]);
        setBranchId(user.branch.id);
      }
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Line helpers ────────────────────────────────────────────────────────────

  function updateLine(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function selectProduct(index: number, p: Product | null) {
    setSelectedProducts((prev) => prev.map((sp, i) => (i === index ? p : sp)));
    if (p) {
      setItems((prev) =>
        prev.map((it, i) =>
          i === index ? { ...it, productId: p.id, descripcion: p.descripcion } : it
        )
      );
    } else {
      setItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, productId: "", descripcion: "" } : it))
      );
    }
  }

  function addLine() {
    setItems((prev) => [...prev, emptyLine()]);
    setSelectedProducts((prev) => [...prev, null]);
  }

  function removeLine(index: number) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Totals ──────────────────────────────────────────────────────────────────

  const subtotal = items.reduce((sum, it) => {
    const qty = parseFloat(it.cantidad) || 0;
    const cost = parseFloat(it.costoUnitario) || 0;
    return sum + qty * cost;
  }, 0);

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!branchId) { toast("error", "Selecciona una sucursal"); return; }
    if (items.some((it) => !it.descripcion.trim())) { toast("error", "Todos los ítems deben tener descripción"); return; }
    if (items.some((it) => parseFloat(it.cantidad) <= 0)) { toast("error", "La cantidad debe ser mayor a 0"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supplierId || undefined,
          branchId,
          tipoDocumento,
          numeroDocumento: numeroDocumento || undefined,
          fechaCompra: fechaCompra || undefined,
          notas: notas || undefined,
          items: items.map((it) => ({
            productId: it.productId || undefined,
            descripcion: it.descripcion,
            cantidad: parseFloat(it.cantidad),
            costoUnitario: parseFloat(it.costoUnitario),
          })),
        }),
      });

      if (!res.ok) {
        try {
          const err = await res.json();
          toast("error", err.error ?? `Error ${res.status}`);
        } catch {
          toast("error", `Error del servidor (${res.status})`);
        }
        return;
      }

      toast("success", "Compra registrada correctamente");
      router.push("/purchases");
    } catch {
      toast("error", "Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const supplierOptions = [
    { value: "", label: "Sin proveedor" },
    ...suppliers.map((s) => ({ value: s.id, label: s.ruc ? `${s.nombre} (${s.ruc})` : s.nombre })),
  ];

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.nombre }));

  return (
    <div className="flex flex-col h-full">
      <Header title="Nueva Compra" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header fields */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--surface-low)" }}>
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>Datos del documento</p>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Proveedor"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                options={supplierOptions}
              />
              {isAdmin ? (
                <Select
                  label="Sucursal *"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  options={[{ value: "", label: "Seleccionar..." }, ...branchOptions]}
                />
              ) : (
                <div>
                  <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>Sucursal</p>
                  <p className="px-3 py-2 rounded-lg text-xs" style={{ background: "var(--surface-high)", color: "var(--text-base)" }}>
                    {user?.branch?.nombre ?? "—"}
                  </p>
                </div>
              )}
              <Select
                label="Tipo de Documento"
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                options={TIPO_DOC_OPTIONS}
              />
              <Input
                label="N° Documento"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                placeholder="001-001-000000001"
              />
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>
                  Fecha de Compra
                </label>
                <input
                  type="date"
                  value={fechaCompra}
                  onChange={(e) => setFechaCompra(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs"
                  style={{ background: "var(--surface-high)", color: "var(--text-base)", border: "1px solid var(--surface-highest)" }}
                />
              </div>
              <Input
                label="Notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones opcionales"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--surface-low)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>Ítems</p>
              <Button onClick={addLine} variant="ghost">+ Agregar ítem</Button>
            </div>

            <div className="space-y-3">
              {/* Column headers */}
              <div className="grid gap-3" style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr auto" }}>
                {["Descripción / Producto", "Descripción manual", "Cantidad", "Costo Unitario", ""].map((h) => (
                  <p key={h} className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>{h}</p>
                ))}
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="grid gap-3 items-start" style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr auto" }}>
                  {/* Product picker */}
                  <ProductPicker
                    products={products}
                    onSelect={(p) => selectProduct(idx, p)}
                  />
                  {/* Manual description (editable even when product selected) */}
                  <input
                    type="text"
                    value={it.descripcion}
                    onChange={(e) => updateLine(idx, "descripcion", e.target.value)}
                    placeholder="Descripción libre"
                    className="px-3 py-2 rounded-lg text-xs"
                    style={{ background: "var(--surface-high)", color: "var(--text-base)", border: "1px solid var(--surface-highest)", outline: "none" }}
                  />
                  <input
                    type="number"
                    value={it.cantidad}
                    onChange={(e) => updateLine(idx, "cantidad", e.target.value)}
                    min="0.0001"
                    step="0.01"
                    className="px-3 py-2 rounded-lg text-xs"
                    style={{ background: "var(--surface-high)", color: "var(--text-base)", border: "1px solid var(--surface-highest)", outline: "none" }}
                  />
                  <input
                    type="number"
                    value={it.costoUnitario}
                    onChange={(e) => updateLine(idx, "costoUnitario", e.target.value)}
                    min="0"
                    step="0.01"
                    className="px-3 py-2 rounded-lg text-xs"
                    style={{ background: "var(--surface-high)", color: "var(--text-base)", border: "1px solid var(--surface-highest)", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={items.length === 1}
                    className="px-2 py-2 rounded-lg text-xs"
                    style={{ color: "var(--text-muted)", opacity: items.length === 1 ? 0.3 : 1 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Subtotal */}
            <div className="flex justify-end pt-2" style={{ borderTop: "1px solid var(--surface-highest)" }}>
              <div className="text-right">
                <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Total</p>
                <p className="text-xl font-black" style={{ color: "var(--text-base)" }}>
                  $ {subtotal.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => router.push("/purchases")} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Registrando..." : "Registrar Compra"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
