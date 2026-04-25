"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  nombre: string;
  ruc: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  active: boolean;
}

interface PurchaseSummary {
  id: string;
  fechaCompra: string;
  tipoDocumento: string;
  numeroDocumento: string | null;
  subtotal: number;
  total: number;
  notas: string | null;
  supplier: { id: string; nombre: string; ruc: string | null } | null;
  branch: { id: string; nombre: string };
  user: { id: string; name: string };
  _count: { items: number };
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

// ─── Suppliers Tab ────────────────────────────────────────────────────────────

function SuppliersTab() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ ruc: "", nombre: "", email: "", telefono: "", direccion: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`);
    if (res.ok) setSuppliers(await res.json().then((r) => r.data));
  }

  useEffect(() => { load(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() {
    setEditTarget(null);
    setForm({ ruc: "", nombre: "", email: "", telefono: "", direccion: "" });
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditTarget(s);
    setForm({ ruc: s.ruc ?? "", nombre: s.nombre, email: s.email ?? "", telefono: s.telefono ?? "", direccion: s.direccion ?? "" });
    setModalOpen(true);
  }

  async function save() {
    if (!form.nombre.trim()) { toast("error", "Nombre requerido"); return; }
    setSaving(true);
    try {
      const url = editTarget ? `/api/suppliers/${editTarget.id}` : "/api/suppliers";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) {
        try {
          const e = await res.json();
          toast("error", e.error ?? `Error ${res.status}`);
        } catch {
          toast("error", `Error del servidor (${res.status})`);
        }
        return;
      }
      toast("success", editTarget ? "Proveedor actualizado" : "Proveedor creado");
      setModalOpen(false);
      load();
    } catch {
      toast("error", "Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Supplier) {
    if (!confirm(`¿Eliminar proveedor "${s.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/suppliers/${s.id}`, { method: "DELETE" });
      if (res.ok) { toast("success", "Proveedor eliminado"); load(); }
      else {
        const e = await res.json().catch(() => ({}));
        toast("error", e.error ?? `Error ${res.status}`);
      }
    } catch {
      toast("error", "Error de conexión");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Input
          placeholder="Buscar proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openNew}>+ Nuevo Proveedor</Button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--surface-highest)" }}>
        <table className="w-full text-xs">
          <thead style={{ background: "var(--surface-low)" }}>
            <tr>
              {["Nombre", "RUC", "Email", "Teléfono", "Dirección", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)", fontSize: "10px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  No hay proveedores registrados
                </td>
              </tr>
            ) : suppliers.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid var(--surface-highest)" }}>
                <td className="px-4 py-3 font-bold" style={{ color: "var(--text-base)" }}>{s.nombre}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{s.ruc ?? "—"}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{s.email ?? "—"}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{s.telefono ?? "—"}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{s.direccion ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(s)} className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: "var(--surface-high)", color: "var(--text-secondary)" }}>Editar</button>
                    <button onClick={() => remove(s)} className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: "var(--surface-high)", color: "var(--text-muted)" }}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Editar Proveedor" : "Nuevo Proveedor"}>
        <div className="space-y-3">
          <Input label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input label="RUC" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} placeholder="1234567890001" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <Input label="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={saving} className="flex-1">{saving ? "Guardando..." : editTarget ? "Actualizar" : "Crear"}</Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Purchases Tab ────────────────────────────────────────────────────────────

function PurchasesTab() {
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/purchases?${params}`);
    if (res.ok) setPurchases(await res.json().then((r) => r.data));
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-lg text-xs" style={{ background: "var(--surface-high)", color: "var(--text-base)", border: "1px solid var(--surface-highest)" }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-lg text-xs" style={{ background: "var(--surface-high)", color: "var(--text-base)", border: "1px solid var(--surface-highest)" }} />
        </div>
        <Button onClick={load}>Filtrar</Button>
        <Link href="/purchases/new">
          <Button>+ Nueva Compra</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-xs py-8 text-center" style={{ color: "var(--text-muted)" }}>Cargando...</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--surface-highest)" }}>
          <table className="w-full text-xs">
            <thead style={{ background: "var(--surface-low)" }}>
              <tr>
                {["Fecha", "Tipo Doc.", "N° Documento", "Proveedor", "Sucursal", "Ítems", "Total", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)", fontSize: "10px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                    No hay compras registradas
                  </td>
                </tr>
              ) : purchases.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--surface-highest)" }}>
                  <td className="px-4 py-3 font-bold" style={{ color: "var(--text-base)" }}>
                    {new Date(p.fechaCompra).toLocaleDateString("es-EC")}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{TIPO_LABEL[p.tipoDocumento]}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{p.numeroDocumento ?? "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{p.supplier?.nombre ?? "Sin proveedor"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{p.branch.nombre}</td>
                  <td className="px-4 py-3 text-center" style={{ color: "var(--text-secondary)" }}>{p._count.items}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: "var(--text-base)" }}>$ {fmt(Number(p.total))}</td>
                  <td className="px-4 py-3">
                    <Link href={`/purchases/${p.id}`} className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: "var(--surface-high)", color: "var(--text-secondary)" }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            {purchases.length > 0 && (
              <tfoot style={{ background: "var(--surface-low)", borderTop: "2px solid var(--surface-highest)" }}>
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right font-bold tracking-widest uppercase text-[10px]" style={{ color: "var(--text-muted)" }}>Total período</td>
                  <td className="px-4 py-3 font-black" style={{ color: "var(--text-base)" }}>
                    $ {fmt(purchases.reduce((sum, p) => sum + Number(p.total), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "compras" | "proveedores";

export default function PurchasesPage() {
  const [tab, setTab] = useState<Tab>("compras");

  return (
    <div className="flex flex-col h-full">
      <Header title="Compras y Proveedores" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--surface-low)" }}>
          {(["compras", "proveedores"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors"
              style={
                tab === t
                  ? { background: "var(--primary)", color: "var(--on-primary)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {t === "compras" ? "Compras" : "Proveedores"}
            </button>
          ))}
        </div>

        {tab === "compras" ? <PurchasesTab /> : <SuppliersTab />}
      </div>
    </div>
  );
}
