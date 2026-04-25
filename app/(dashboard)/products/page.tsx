"use client";

import { useEffect, useState, FormEvent } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useBusinessType } from "@/lib/business-context";
import {
  UNIDAD_MEDIDA_OPTIONS,
  UNIDAD_MEDIDA_LABEL,
  type UnidadMedida,
} from "@/lib/business-config";

interface ProductMetadata {
  lote?: string;
  fechaVencimiento?: string;
  registroSanitario?: string;
  requiereReceta?: boolean;
  principioActivo?: string;
  gradosAlcohol?: number;
  volumenMl?: number;
  paisOrigen?: string;
}

interface Product {
  id: string;
  codigoPrincipal: string;
  codigoAuxiliar: string | null;
  descripcion: string;
  precio: number;
  tipoIva: string;
  tipo: string;
  isFavorite: boolean;
  codigoBarras: string | null;
  unidadMedida: UnidadMedida;
  metadata?: ProductMetadata | null;
}

interface InvConfig {
  tracksInventory: boolean;
  costoPromedio: string;
  stockMinimo: string;
}

const IVA_RATE = Number(process.env.NEXT_PUBLIC_IVA_RATE ?? 15);

const IVA_OPTIONS = [
  { value: "IVA_0", label: "0%" },
  { value: "IVA_STANDARD", label: `${IVA_RATE}%` },
];

const TIPO_OPTIONS = [
  { value: "BIEN", label: "Bien" },
  { value: "SERVICIO", label: "Servicio" },
];

const IVA_LABEL: Record<string, string> = {
  IVA_0: "0%",
  IVA_5: "5%",
  IVA_STANDARD: `${IVA_RATE}%`,
  NO_APLICA: "N/A",
};

const emptyForm = {
  codigoPrincipal: "",
  codigoAuxiliar: "",
  descripcion: "",
  precio: "",
  tipoIva: "IVA_STANDARD",
  tipo: "BIEN",
  codigoBarras: "",
  unidadMedida: "UNIDAD" as UnidadMedida,
  // metadata fields
  lote: "",
  fechaVencimiento: "",
  registroSanitario: "",
  requiereReceta: false,
  principioActivo: "",
  gradosAlcohol: "",
  volumenMl: "",
  paisOrigen: "",
};

const emptyInvForm: InvConfig = {
  tracksInventory: true,
  costoPromedio: "",
  stockMinimo: "",
};

export default function ProductsPage() {
  const { success, error: toastError } = useToast();
  const { user } = useCurrentUser();
  const { config } = useBusinessType();
  const pf = config.productFields;
  const isAdmin = user?.role === "ADMIN";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

  const [invModalOpen, setInvModalOpen] = useState(false);
  const [invProduct, setInvProduct] = useState<Product | null>(null);
  const [invForm, setInvForm] = useState<InvConfig>(emptyInvForm);
  const [invSaving, setInvSaving] = useState(false);
  const [invLoading, setInvLoading] = useState(false);

  async function loadProducts() {
    const res = await fetch(`/api/products?search=${search}`);
    const data = await res.json();
    if (data.success) setProducts(data.data);
    setLoading(false);
  }

  useEffect(() => { loadProducts(); }, [search]);

  function openCreate() {
    setEditProduct(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditProduct(product);
    const m = product.metadata ?? {};
    setForm({
      codigoPrincipal: product.codigoPrincipal,
      codigoAuxiliar: product.codigoAuxiliar ?? "",
      descripcion: product.descripcion,
      precio: String(product.precio),
      tipoIva: product.tipoIva,
      tipo: product.tipo,
      codigoBarras: product.codigoBarras ?? "",
      unidadMedida: product.unidadMedida ?? "UNIDAD",
      lote: m.lote ?? "",
      fechaVencimiento: m.fechaVencimiento ? m.fechaVencimiento.slice(0, 10) : "",
      registroSanitario: m.registroSanitario ?? "",
      requiereReceta: m.requiereReceta ?? false,
      principioActivo: m.principioActivo ?? "",
      gradosAlcohol: m.gradosAlcohol != null ? String(m.gradosAlcohol) : "",
      volumenMl: m.volumenMl != null ? String(m.volumenMl) : "",
      paisOrigen: m.paisOrigen ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : "/api/products";
      const method = editProduct ? "PUT" : "POST";

      // Build metadata only with fields that have values
      const metadata: Record<string, unknown> = {};
      if (pf.lote && form.lote) metadata.lote = form.lote;
      if (pf.fechaVencimiento && form.fechaVencimiento) metadata.fechaVencimiento = form.fechaVencimiento;
      if (pf.registroSanitario && form.registroSanitario) metadata.registroSanitario = form.registroSanitario;
      if (pf.requiereReceta) metadata.requiereReceta = form.requiereReceta;
      if (pf.principioActivo && form.principioActivo) metadata.principioActivo = form.principioActivo;
      if (pf.gradosAlcohol && form.gradosAlcohol) metadata.gradosAlcohol = parseFloat(form.gradosAlcohol);
      if (pf.volumenMl && form.volumenMl) metadata.volumenMl = parseFloat(form.volumenMl);
      if (pf.paisOrigen && form.paisOrigen) metadata.paisOrigen = form.paisOrigen;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigoPrincipal: form.codigoPrincipal,
          codigoAuxiliar: form.codigoAuxiliar || undefined,
          descripcion: form.descripcion,
          precio: parseFloat(form.precio),
          tipoIva: form.tipoIva,
          tipo: form.tipo,
          codigoBarras: form.codigoBarras || undefined,
          unidadMedida: form.unidadMedida,
          metadata: Object.keys(metadata).length ? metadata : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      success(editProduct ? "Producto actualizado" : "Producto creado exitosamente");
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleFavorite(product: Product) {
    if (togglingFavorite === product.id) return;
    // Double-click only marks as favorite; removing is via the star button (isFavorite toggle)
    const next = !product.isFavorite;
    setTogglingFavorite(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isFavorite: next } : p))
      );
      success(next ? "Marcado como favorito" : "Quitado de favoritos");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al actualizar favorito");
    } finally {
      setTogglingFavorite(null);
    }
  }

  async function openInvModal(product: Product) {
    setInvProduct(product);
    setInvForm(emptyInvForm);
    setInvModalOpen(true);
    setInvLoading(true);
    try {
      const res = await fetch(`/api/inventory/products?productId=${product.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        const cfg = data.data;
        setInvForm({
          tracksInventory: cfg.tracksInventory ?? true,
          costoPromedio: cfg.costoPromedio != null ? String(cfg.costoPromedio) : "",
          stockMinimo: cfg.stockMinimo != null ? String(cfg.stockMinimo) : "",
        });
      }
    } finally {
      setInvLoading(false);
    }
  }

  async function handleInvSubmit(e: FormEvent) {
    e.preventDefault();
    if (!invProduct) return;
    setInvSaving(true);
    try {
      const res = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: invProduct.id,
          tracksInventory: invForm.tracksInventory,
          costoPromedio: invForm.costoPromedio ? parseFloat(invForm.costoPromedio) : undefined,
          stockMinimo: invForm.stockMinimo ? parseFloat(invForm.stockMinimo) : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      success("Inventario configurado correctamente");
      setInvModalOpen(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al configurar inventario");
    } finally {
      setInvSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      success("Producto eliminado");
      loadProducts();
    } else {
      toastError(data.error);
    }
  }

  return (
    <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
      <Header
        title="Productos"
        subtitle="Catálogo de productos y servicios"
        action={<Button onClick={openCreate}>+ Nuevo Producto</Button>}
      />

      <div className="mb-6 max-w-sm">
        <Input
          placeholder="Buscar por código o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl overflow-hidden p-4" style={{ background: "var(--surface-white)" }}>
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center">
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "var(--surface-low)" }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>Sin productos</p>
            <p className="text-[11px] font-medium mb-5" style={{ color: "var(--text-muted)" }}>
              Registre su catálogo de productos y servicios
            </p>
            <Button size="sm" onClick={openCreate}>Agregar primer producto</Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--surface-low)" }}>
                {(["fav", "Código", "Descripción", "Tipo", "Precio", "IVA", "acciones"] as const).map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-[9px] font-bold tracking-[0.15em] uppercase
                      ${h === "Precio" || h === "acciones" ? "text-right" : h === "IVA" || h === "fav" ? "text-center" : "text-left"}`}
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h === "fav" || h === "acciones" ? "" : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr
                  key={p.id}
                  style={{ background: idx % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                  onDoubleClick={() => { if (!p.isFavorite) handleToggleFavorite(p); }}
                  title={p.isFavorite ? "Producto favorito" : "Doble clic para marcar como favorito"}
                  className="cursor-pointer"
                >
                  <td className="px-4 py-3.5 text-center w-10">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(p); }}
                      disabled={togglingFavorite === p.id}
                      title={p.isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
                      className="text-lg leading-none transition-transform hover:scale-125"
                      style={{ color: p.isFavorite ? "#FFD700" : "var(--text-muted)", opacity: togglingFavorite === p.id ? 0.5 : 1 }}
                    >
                      {p.isFavorite ? "★" : "☆"}
                    </button>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-sm font-semibold" style={{ color: "var(--text-base)" }}>
                    {p.codigoPrincipal}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-bold" style={{ color: "var(--text-base)" }}>
                    {p.descripcion}
                  </td>
                  <td className="px-6 py-3.5 text-sm">
                    <Badge variant={p.tipo === "SERVICIO" ? "purple" : "info"}>{p.tipo}</Badge>
                  </td>
                  <td className="px-6 py-3.5 text-sm font-bold text-right" style={{ color: "var(--text-base)" }}>
                    ${Number(p.precio).toFixed(2)}
                    {p.unidadMedida && p.unidadMedida !== "UNIDAD" && (
                      <span
                        className="ml-1 text-[9px] font-bold tracking-widest uppercase"
                        style={{ color: "var(--text-muted)" }}
                      >
                        /{UNIDAD_MEDIDA_LABEL[p.unidadMedida]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase"
                      style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
                    >
                      {IVA_LABEL[p.tipoIva]}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      {isAdmin && p.tipo === "BIEN" && (
                        <Button size="sm" variant="ghost" onClick={() => openInvModal(p)}>
                          Stock
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Editar</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal configurar inventario */}
      <Modal
        open={invModalOpen}
        onClose={() => setInvModalOpen(false)}
        title={`Inventario — ${invProduct?.descripcion ?? ""}`}
      >
        {invLoading ? (
          <div className="py-8 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <form onSubmit={handleInvSubmit} className="space-y-4">
            <div className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                id="tracksInventory"
                checked={invForm.tracksInventory}
                onChange={(e) => setInvForm({ ...invForm, tracksInventory: e.target.checked })}
                className="w-4 h-4 accent-[var(--primary)]"
              />
              <label htmlFor="tracksInventory" className="text-sm font-bold" style={{ color: "var(--text-base)" }}>
                Activar control de stock
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Costo Promedio (USD)"
                type="number"
                step="0.0001"
                min="0"
                value={invForm.costoPromedio}
                onChange={(e) => setInvForm({ ...invForm, costoPromedio: e.target.value })}
                placeholder="0.0000"
              />
              <Input
                label="Stock Mínimo"
                type="number"
                step="0.01"
                min="0"
                value={invForm.stockMinimo}
                onChange={(e) => setInvForm({ ...invForm, stockMinimo: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" onClick={() => setInvModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={invSaving}>
                Guardar
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct ? "Editar Producto" : "Nuevo Producto"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Código Principal"
              value={form.codigoPrincipal}
              onChange={(e) => setForm({ ...form, codigoPrincipal: e.target.value })}
              required
              placeholder="PROD001"
            />
            <Input
              label="Código Auxiliar"
              value={form.codigoAuxiliar}
              onChange={(e) => setForm({ ...form, codigoAuxiliar: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <Input
            label="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            required
            placeholder="Nombre del producto o servicio"
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Precio (USD)"
              type="number"
              step="0.01"
              min="0"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              required
              placeholder="0.00"
            />
            <Select
              label="IVA"
              options={IVA_OPTIONS}
              value={form.tipoIva}
              onChange={(e) => setForm({ ...form, tipoIva: e.target.value })}
            />
            <Select
              label="Tipo"
              options={TIPO_OPTIONS}
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            />
          </div>
          {/* ── Barcode + Unit ── */}
          {(pf.codigoBarras || pf.unidadMedida) && (
            <div className="grid grid-cols-2 gap-4">
              {pf.codigoBarras && (
                <div className={pf.unidadMedida ? "" : "col-span-2"}>
                  <Input
                    label="Código de Barras (EAN / UPC)"
                    value={form.codigoBarras}
                    onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
                    placeholder="ej. 7501234567890"
                  />
                </div>
              )}
              {pf.unidadMedida && (
                <div className={pf.codigoBarras ? "" : "col-span-2"}>
                  <Select
                    label="Unidad de Medida"
                    options={UNIDAD_MEDIDA_OPTIONS}
                    value={form.unidadMedida}
                    onChange={(e) =>
                      setForm({ ...form, unidadMedida: e.target.value as UnidadMedida })
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Pharmacy fields ── */}
          {(pf.lote || pf.fechaVencimiento || pf.registroSanitario || pf.requiereReceta || pf.principioActivo) && (
            <div
              className="space-y-4 pt-4"
              style={{ borderTop: "1px solid var(--surface-highest)" }}
            >
              <p
                className="text-[9px] font-bold tracking-[0.15em] uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                Información Farmacéutica
              </p>
              {pf.principioActivo && (
                <Input
                  label="Principio Activo"
                  value={form.principioActivo}
                  onChange={(e) => setForm({ ...form, principioActivo: e.target.value })}
                  placeholder="ej. Amoxicilina"
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                {pf.lote && (
                  <Input
                    label="Lote"
                    value={form.lote}
                    onChange={(e) => setForm({ ...form, lote: e.target.value })}
                    placeholder="ej. AB-2024-001"
                  />
                )}
                {pf.fechaVencimiento && (
                  <Input
                    label={`Vencimiento${config.validations.requireExpiryDate ? " *" : ""}`}
                    type="date"
                    value={form.fechaVencimiento}
                    onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
                    required={config.validations.requireExpiryDate}
                  />
                )}
              </div>
              {pf.registroSanitario && (
                <Input
                  label="Registro Sanitario (ARCSA)"
                  value={form.registroSanitario}
                  onChange={(e) => setForm({ ...form, registroSanitario: e.target.value })}
                  placeholder="ej. 12345-INS-0000-10"
                />
              )}
              {pf.requiereReceta && (
                <div className="flex items-center gap-3">
                  <input
                    id="requiereReceta"
                    type="checkbox"
                    checked={form.requiereReceta}
                    onChange={(e) => setForm({ ...form, requiereReceta: e.target.checked })}
                    className="w-4 h-4"
                    style={{ accentColor: "var(--primary-focus)" }}
                  />
                  <label
                    htmlFor="requiereReceta"
                    className="text-sm font-medium"
                    style={{ color: "var(--text-base)" }}
                  >
                    Requiere receta médica
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ── Liquor store fields ── */}
          {(pf.gradosAlcohol || pf.volumenMl || pf.paisOrigen) && (
            <div
              className="space-y-4 pt-4"
              style={{ borderTop: "1px solid var(--surface-highest)" }}
            >
              <p
                className="text-[9px] font-bold tracking-[0.15em] uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                Información del Producto
              </p>
              <div className="grid grid-cols-2 gap-4">
                {pf.gradosAlcohol && (
                  <Input
                    label="Grados de Alcohol (%)"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.gradosAlcohol}
                    onChange={(e) => setForm({ ...form, gradosAlcohol: e.target.value })}
                    placeholder="ej. 40.0"
                  />
                )}
                {pf.volumenMl && (
                  <Input
                    label="Volumen (ml)"
                    type="number"
                    step="1"
                    min="0"
                    value={form.volumenMl}
                    onChange={(e) => setForm({ ...form, volumenMl: e.target.value })}
                    placeholder="ej. 750"
                  />
                )}
              </div>
              {pf.paisOrigen && (
                <Input
                  label="País de Origen"
                  value={form.paisOrigen}
                  onChange={(e) => setForm({ ...form, paisOrigen: e.target.value })}
                  placeholder="ej. Escocia"
                />
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editProduct ? "Actualizar" : "Crear Producto"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
