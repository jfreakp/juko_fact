"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";

interface Client {
  id: string;
  razonSocial: string;
  identificacion: string;
  tipoIdentif: string;
}

interface Product {
  id: string;
  codigoPrincipal: string;
  descripcion: string;
  precio: number;
  tipoIva: string;
}

interface DetailLine {
  id: string;
  productId?: string;
  codigoPrincipal: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  descuento: string;
  tipoIva: string;
}

const IVA_OPTIONS = [
  { value: "IVA_0", label: "IVA 0%" },
  { value: "IVA_5", label: "IVA 5%" },
  { value: "IVA_12", label: "IVA 12%" },
  { value: "IVA_15", label: "IVA 15%" },
  { value: "NO_APLICA", label: "No aplica" },
];

const IVA_RATES: Record<string, number> = {
  IVA_0: 0,
  IVA_5: 5,
  IVA_12: 12,
  IVA_15: 15,
  NO_APLICA: 0,
};

function emptyLine(): DetailLine {
  return {
    id: Math.random().toString(36).slice(2),
    productId: undefined,
    codigoPrincipal: "",
    descripcion: "",
    cantidad: "1",
    precioUnitario: "0.00",
    descuento: "0.00",
    tipoIva: "IVA_12",
  };
}

function calcLine(line: DetailLine) {
  const cant = parseFloat(line.cantidad) || 0;
  const price = parseFloat(line.precioUnitario) || 0;
  const desc = parseFloat(line.descuento) || 0;
  const subtotal = Math.round((cant * price - desc) * 100) / 100;
  const rate = IVA_RATES[line.tipoIva] ?? 0;
  const iva = Math.round(((subtotal * rate) / 100) * 100) / 100;
  return { subtotal, iva, total: subtotal + iva };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState("");
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [observaciones, setObservaciones] = useState("");
  const [lines, setLines] = useState<DetailLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([c, p]) => {
      if (c.success) setClients(c.data);
      if (p.success) setProducts(p.data);
    });
  }, []);

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(id: string, updates: Partial<DetailLine>) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  }

  function selectProduct(lineId: string, product: Product) {
    updateLine(lineId, {
      productId: product.id,
      codigoPrincipal: product.codigoPrincipal,
      descripcion: product.descripcion,
      precioUnitario: String(product.precio),
      tipoIva: product.tipoIva,
    });
    setProductSearch((prev) => ({ ...prev, [lineId]: "" }));
  }

  const totals = lines.reduce(
    (acc, line) => {
      const { subtotal, iva, total } = calcLine(line);
      acc.subtotal += subtotal;
      acc.iva += iva;
      acc.total += total;
      return acc;
    },
    { subtotal: 0, iva: 0, total: 0 }
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!clientId) {
      toastError("Seleccione un cliente");
      return;
    }
    if (lines.some((l) => !l.descripcion || !l.codigoPrincipal)) {
      toastError("Complete todos los campos de los detalles");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          fechaEmision,
          observaciones,
          details: lines.map((l) => ({
            productId: l.productId,
            codigoPrincipal: l.codigoPrincipal,
            descripcion: l.descripcion,
            cantidad: parseFloat(l.cantidad),
            precioUnitario: parseFloat(l.precioUnitario),
            descuento: parseFloat(l.descuento) || 0,
            tipoIva: l.tipoIva,
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      success("Factura creada exitosamente");
      router.push("/dashboard/invoices");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al crear factura");
    } finally {
      setSaving(false);
    }
  }

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.razonSocial} - ${c.identificacion}`,
  }));

  const filteredProducts = (search: string) =>
    products.filter(
      (p) =>
        p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        p.codigoPrincipal.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div>
      <Header
        title="Nueva Factura"
        subtitle="Crear comprobante electrónico"
        action={
          <Button variant="secondary" onClick={() => router.back()}>
            ← Volver
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left: client + fecha */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Datos del Comprobante</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Select
                  label="Cliente"
                  options={clientOptions}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Seleccione un cliente"
                />
              </div>
              <Input
                label="Fecha de Emisión"
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Observaciones</label>
              <textarea
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones adicionales (opcional)"
              />
            </div>
          </div>

          {/* Right: totals */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Resumen</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IVA</span>
                <span className="font-medium">${totals.iva.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-xl text-blue-600">
                  ${totals.total.toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              size="lg"
              loading={saving}
            >
              Crear Factura
            </Button>
          </div>
        </div>

        {/* Details table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Detalles</h2>
            <Button size="sm" variant="secondary" type="button" onClick={addLine}>
              + Agregar línea
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left w-48">Producto</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right w-20">Cant.</th>
                  <th className="px-4 py-3 text-right w-28">P. Unit.</th>
                  <th className="px-4 py-3 text-right w-24">Desc.</th>
                  <th className="px-4 py-3 text-center w-28">IVA</th>
                  <th className="px-4 py-3 text-right w-28">Subtotal</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line) => {
                  const { subtotal } = calcLine(line);
                  const pSearch = productSearch[line.id] ?? "";
                  const filtered = filteredProducts(pSearch);

                  return (
                    <tr key={line.id}>
                      {/* Product search */}
                      <td className="px-4 py-2 relative">
                        <input
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Buscar..."
                          value={pSearch || line.codigoPrincipal}
                          onChange={(e) => {
                            setProductSearch((prev) => ({ ...prev, [line.id]: e.target.value }));
                            if (!e.target.value) {
                              updateLine(line.id, { productId: undefined, codigoPrincipal: "" });
                            }
                          }}
                          onFocus={() =>
                            setProductSearch((prev) => ({ ...prev, [line.id]: "" }))
                          }
                        />
                        {pSearch && filtered.length > 0 && (
                          <div className="absolute top-full left-0 z-10 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filtered.slice(0, 8).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b last:border-0"
                                onClick={() => selectProduct(line.id, p)}
                              >
                                <div className="font-medium">{p.descripcion}</div>
                                <div className="text-gray-400">{p.codigoPrincipal} — ${Number(p.precio).toFixed(2)}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-2">
                        <input
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={line.descripcion}
                          onChange={(e) => updateLine(line.id, { descripcion: e.target.value })}
                          placeholder="Descripción"
                          required
                        />
                      </td>

                      {/* Cantidad */}
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={line.cantidad}
                          onChange={(e) => updateLine(line.id, { cantidad: e.target.value })}
                        />
                      </td>

                      {/* Price */}
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={line.precioUnitario}
                          onChange={(e) => updateLine(line.id, { precioUnitario: e.target.value })}
                        />
                      </td>

                      {/* Descuento */}
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={line.descuento}
                          onChange={(e) => updateLine(line.id, { descuento: e.target.value })}
                        />
                      </td>

                      {/* IVA */}
                      <td className="px-4 py-2">
                        <select
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={line.tipoIva}
                          onChange={(e) => updateLine(line.id, { tipoIva: e.target.value })}
                        >
                          {IVA_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Subtotal */}
                      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                        ${subtotal.toFixed(2)}
                      </td>

                      {/* Remove */}
                      <td className="px-4 py-2 text-center">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="text-red-400 hover:text-red-600 text-lg leading-none"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  );
}
