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
}

const IVA_OPTIONS = [
  { value: "IVA_0", label: "IVA 0%" },
  { value: "IVA_5", label: "IVA 5%" },
  { value: "IVA_12", label: "IVA 12%" },
  { value: "IVA_15", label: "IVA 15%" },
  { value: "NO_APLICA", label: "No aplica" },
];

const TIPO_OPTIONS = [
  { value: "BIEN", label: "Bien" },
  { value: "SERVICIO", label: "Servicio" },
];

const IVA_LABEL: Record<string, string> = {
  IVA_0: "0%",
  IVA_5: "5%",
  IVA_12: "12%",
  IVA_15: "15%",
  NO_APLICA: "N/A",
};

const emptyForm = {
  codigoPrincipal: "",
  codigoAuxiliar: "",
  descripcion: "",
  precio: "",
  tipoIva: "IVA_12",
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

  async function loadProducts() {
    const res = await fetch(`/api/products?search=${search}`);
    const data = await res.json();
    if (data.success) setProducts(data.data);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, [search]);

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
    <div>
      <Header
        title="Productos"
        subtitle="Catálogo de productos y servicios"
        action={<Button onClick={openCreate}>+ Nuevo Producto</Button>}
      />

      <div className="mb-4">
        <Input
          placeholder="Buscar por código o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-3">No hay productos registrados</p>
            <Button size="sm" onClick={openCreate}>Agregar primer producto</Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <th className="px-6 py-3 text-left">Código</th>
                <th className="px-6 py-3 text-left">Descripción</th>
                <th className="px-6 py-3 text-left">Tipo</th>
                <th className="px-6 py-3 text-right">Precio</th>
                <th className="px-6 py-3 text-center">IVA</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono text-gray-900">{p.codigoPrincipal}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 font-medium">{p.descripcion}</td>
                  <td className="px-6 py-3 text-sm">
                    <Badge variant={p.tipo === "SERVICIO" ? "purple" : "info"}>
                      {p.tipo}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-right text-gray-900">
                    ${Number(p.precio).toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-sm text-center">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      {IVA_LABEL[p.tipoIva]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
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
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
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
