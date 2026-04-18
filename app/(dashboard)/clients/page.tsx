"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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

interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export default function ClientsPage() {
  const { success, error: toastError } = useToast();
  const { user } = useCurrentUser();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function openImport() {
    setImportFile(null);
    setImportResult(null);
    setImportOpen(true);
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setImportFile(f);
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await fetch("/api/clients/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setImportResult(data.data);
      if (data.data.created > 0 || data.data.updated > 0) loadClients();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setImporting(false);
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
        action={
          <div className="flex gap-2">
            {user?.role === "ADMIN" && (
              <Button variant="ghost" onClick={openImport}>Importar Excel</Button>
            )}
            <Button onClick={openCreate}>+ Nuevo Cliente</Button>
          </div>
        }
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

      {/* Import Modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importar Clientes desde Excel">
        <div className="space-y-4">
          {/* Column reference + template download */}
          <div
            className="rounded-lg p-3 text-[11px] font-medium space-y-2"
            style={{ background: "var(--surface-low)", color: "var(--text-muted)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-widest" style={{ color: "var(--text-base)" }}>
                  Columnas esperadas
                </p>
                <p>A: Tipo Id. &nbsp;·&nbsp; B: CI/RUC &nbsp;·&nbsp; C: Razón Social &nbsp;·&nbsp; E: Dirección &nbsp;·&nbsp; F: Teléfono &nbsp;·&nbsp; H: Email</p>
                <p>Los clientes ya existentes (mismo CI/RUC) se omiten sin error.</p>
              </div>
              <a
                href="/api/clients/import"
                download="plantilla_clientes.xlsx"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-colors"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-fg, #000)",
                  textDecoration: "none",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Plantilla
              </a>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className="rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 py-8"
            style={{
              borderColor: dragOver ? "var(--primary)" : "var(--border)",
              background: dragOver ? "var(--surface-low)" : "transparent",
            }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              style={{ color: importFile ? "var(--primary)" : "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {importFile ? (
              <p className="text-sm font-bold" style={{ color: "var(--text-base)" }}>{importFile.name}</p>
            ) : (
              <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                Arrastra el .xlsx aquí o haz clic para seleccionar
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) setImportFile(e.target.files[0]); }}
            />
          </div>

          {/* Result */}
          {importResult && (
            <div className="rounded-lg p-4 space-y-2" style={{ background: "var(--surface-low)" }}>
              <div className="flex gap-4 text-sm">
                <span>
                  <span className="font-bold" style={{ color: "var(--success-text)" }}>{importResult.created}</span>
                  <span className="ml-1 font-medium" style={{ color: "var(--text-muted)" }}>nuevos</span>
                </span>
                <span>
                  <span className="font-bold" style={{ color: "var(--info-text)" }}>{importResult.updated}</span>
                  <span className="ml-1 font-medium" style={{ color: "var(--text-muted)" }}>actualizados</span>
                </span>
                {importResult.errors.length > 0 && (
                  <span>
                    <span className="font-bold" style={{ color: "var(--danger-text)" }}>{importResult.errors.length}</span>
                    <span className="ml-1 font-medium" style={{ color: "var(--text-muted)" }}>errores</span>
                  </span>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {importResult.errors.slice(0, 20).map((e) => (
                    <p key={e.row} className="text-[11px] font-medium" style={{ color: "var(--danger-text)" }}>
                      {e.message}
                    </p>
                  ))}
                  {importResult.errors.length > 20 && (
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      ... y {importResult.errors.length - 20} más
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" type="button" onClick={() => setImportOpen(false)}>Cerrar</Button>
            <Button onClick={handleImport} loading={importing} disabled={!importFile}>
              Importar
            </Button>
          </div>
        </div>
      </Modal>

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
