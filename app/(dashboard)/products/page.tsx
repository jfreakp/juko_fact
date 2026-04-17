"use client";

import { useEffect, useState, FormEvent } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface Product {
  id: string;
  codigoPrincipal: string;
  codigoAuxiliar: string | null;
  descripcion: string;
  precio: number;
  tipoIva: string;
  tipo: string;
  isFavorite: boolean;
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
};

export default function ProductsPage() {
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

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
    setForm({
      codigoPrincipal: product.codigoPrincipal,
      codigoAuxiliar: product.codigoAuxiliar ?? "",
      descripcion: product.descripcion,
      precio: String(product.precio),
      tipoIva: product.tipoIva,
      tipo: product.tipo,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : "/api/products";
      const method = editProduct ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, precio: parseFloat(form.precio) }),
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
