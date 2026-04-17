"use client";

import { useEffect, useState, FormEvent } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface Client {
  id: string;
  tipoIdentif: string;
  identificacion: string;
  razonSocial: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
}

const TIPO_IDENTIF_OPTIONS = [
  { value: "CEDULA", label: "Cédula" },
  { value: "RUC", label: "RUC" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "CONSUMIDOR_FINAL", label: "Consumidor Final" },
];

const TIPO_IDENTIF_LABEL: Record<string, string> = {
  CEDULA: "Cédula",
  RUC: "RUC",
  PASAPORTE: "Pasaporte",
  CONSUMIDOR_FINAL: "Cons. Final",
};

const emptyForm = {
  tipoIdentif: "CEDULA",
  identificacion: "",
  razonSocial: "",
  email: "",
  telefono: "",
  direccion: "",
};

export default function ClientsPage() {
  const { success, error: toastError } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function loadClients() {
    const res = await fetch(`/api/clients?search=${search}`);
    const data = await res.json();
    if (data.success) setClients(data.data);
    setLoading(false);
  }

  useEffect(() => { loadClients(); }, [search]);

  function openCreate() {
    setEditClient(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditClient(client);
    setForm({
      tipoIdentif: client.tipoIdentif,
      identificacion: client.identificacion,
      razonSocial: client.razonSocial,
      email: client.email ?? "",
      telefono: client.telefono ?? "",
      direccion: client.direccion ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editClient ? `/api/clients/${editClient.id}` : "/api/clients";
      const method = editClient ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      success(editClient ? "Cliente actualizado" : "Cliente creado exitosamente");
      setModalOpen(false);
      loadClients();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      success("Cliente eliminado");
      loadClients();
    } else {
      toastError(data.error);
    }
  }

  return (
    <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
      <Header
        title="Clientes"
        subtitle={`Gestión de ${clients.length} socios comerciales activos`}
        action={<Button onClick={openCreate}>+ Nuevo Cliente</Button>}
      />

      {/* Search */}
      <div className="mb-6 max-w-sm">
        <Input
          placeholder="Buscar cliente, RUC o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-white)" }}>
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="p-16 text-center">
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "var(--surface-low)" }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>Sin clientes</p>
            <p className="text-[11px] font-medium mb-5" style={{ color: "var(--text-muted)" }}>
              Registre su primer socio comercial
            </p>
            <Button size="sm" onClick={openCreate}>Agregar primer cliente</Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--surface-low)" }}>
                {["Tipo", "Identificación", "Razón Social", "Email", "Teléfono", ""].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-left text-[9px] font-bold tracking-[0.15em] uppercase ${h === "" ? "text-right" : ""}`}
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, idx) => (
                <tr
                  key={c.id}
                  style={{ background: idx % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                >
                  <td className="px-6 py-3.5">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase"
                      style={{ background: "var(--info-bg)", color: "var(--info-text)" }}
                    >
                      {TIPO_IDENTIF_LABEL[c.tipoIdentif]}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-sm font-semibold" style={{ color: "var(--text-base)" }}>
                    {c.identificacion}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-bold" style={{ color: "var(--text-base)" }}>
                    {c.razonSocial}
                  </td>
                  <td className="px-6 py-3.5 text-sm" style={{ color: "var(--text-muted)" }}>
                    {c.email ?? "—"}
                  </td>
                  <td className="px-6 py-3.5 text-sm" style={{ color: "var(--text-muted)" }}>
                    {c.telefono ?? "—"}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Editar</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(c.id)}>Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editClient ? "Editar Cliente" : "Nuevo Cliente"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Tipo de Identificación"
            options={TIPO_IDENTIF_OPTIONS}
            value={form.tipoIdentif}
            onChange={(e) => setForm({ ...form, tipoIdentif: e.target.value })}
          />
          <Input
            label="Identificación"
            value={form.identificacion}
            onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
            required
            placeholder="0999999999001"
          />
          <Input
            label="Razón Social / Nombre"
            value={form.razonSocial}
            onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
            required
            placeholder="Nombre completo o razón social"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="cliente@email.com"
          />
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            placeholder="0999999999"
          />
          <Input
            label="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            placeholder="Dirección del cliente"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editClient ? "Actualizar" : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
