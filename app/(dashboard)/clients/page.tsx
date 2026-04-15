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

  useEffect(() => {
    loadClients();
  }, [search]);

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
    <div>
      <Header
        title="Clientes"
        subtitle="Gestión de clientes del sistema"
        action={<Button onClick={openCreate}>+ Nuevo Cliente</Button>}
      />

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre, identificación o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-3">No hay clientes registrados</p>
            <Button size="sm" onClick={openCreate}>Agregar primer cliente</Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <th className="px-6 py-3 text-left">Tipo</th>
                <th className="px-6 py-3 text-left">Identificación</th>
                <th className="px-6 py-3 text-left">Razón Social</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Teléfono</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {TIPO_IDENTIF_LABEL[c.tipoIdentif]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-mono text-gray-900">{c.identificacion}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 font-medium">{c.razonSocial}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{c.email ?? "—"}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{c.telefono ?? "—"}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(c.id)}>
                        Eliminar
                      </Button>
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
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
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
