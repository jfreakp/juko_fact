"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface BranchRow {
  id: string;
  nombre: string;
  direccion: string | null;
  active: boolean;
  createdAt: string;
  _count: { users: number; invoices: number };
}

const emptyForm = { nombre: "", direccion: "" };

export default function BranchesPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useCurrentUser();
  const { success, error: toastError } = useToast();

  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<BranchRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Guard: redirect if not ADMIN
  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== "ADMIN") {
      router.replace("/");
    }
  }, [authLoading, currentUser, router]);

  async function loadBranches() {
    const res = await fetch("/api/branches");
    const data = await res.json();
    if (data.success) setBranches(data.data);
    setLoading(false);
  }

  useEffect(() => {
    if (currentUser?.role === "ADMIN") loadBranches();
  }, [currentUser]);

  function openCreate() {
    setEditBranch(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(b: BranchRow) {
    setEditBranch(b);
    setForm({ nombre: b.nombre, direccion: b.direccion ?? "" });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editBranch ? `/api/branches/${editBranch.id}` : "/api/branches";
      const method = editBranch ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre, direccion: form.direccion || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      success(editBranch ? "Sucursal actualizada" : "Sucursal creada");
      setModalOpen(false);
      loadBranches();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b: BranchRow) {
    if (!confirm(`¿Desactivar sucursal "${b.nombre}"?`)) return;
    const res = await fetch(`/api/branches/${b.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      success("Sucursal desactivada");
      loadBranches();
    } else {
      toastError(data.error ?? "Error");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: "var(--surface)" }}>
        <div className="h-8 w-48 rounded skeleton mb-6" />
        <div className="h-64 rounded-xl skeleton" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--surface)" }}>
      <Header
        title="Sucursales"
        subtitle={`${branches.length} sucursal${branches.length !== 1 ? "es" : ""} registrada${branches.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={openCreate}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva sucursal
          </Button>
        }
      />

      {branches.length === 0 ? (
        <div
          className="rounded-xl flex flex-col items-center justify-center py-20 gap-4"
          style={{ border: "2px dashed var(--border-subtle)" }}
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <div className="text-center">
            <p className="font-bold text-sm" style={{ color: "var(--text-base)" }}>
              No hay sucursales registradas
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Crea tu primera sucursal para asignar usuarios y facturas
            </p>
          </div>
          <Button onClick={openCreate}>Crear primera sucursal</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className="rounded-xl p-5 flex flex-col gap-3"
              style={{
                background: "var(--surface-white)",
                border: "2px solid var(--surface-highest)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-sm" style={{ color: "var(--text-base)" }}>
                    {b.nombre}
                  </p>
                  {b.direccion && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {b.direccion}
                    </p>
                  )}
                </div>
                <span
                  className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded flex-shrink-0"
                  style={
                    b.active
                      ? { background: "var(--success-bg)", color: "var(--success-text)" }
                      : { background: "var(--error-bg)", color: "var(--error-text)" }
                  }
                >
                  {b.active ? "Activa" : "Inactiva"}
                </span>
              </div>

              <div
                className="flex gap-4 pt-3"
                style={{ borderTop: "1px solid var(--surface-highest)" }}
              >
                <div className="text-center">
                  <p className="text-lg font-black" style={{ color: "var(--text-base)" }}>
                    {b._count.users}
                  </p>
                  <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                    Usuarios
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black" style={{ color: "var(--text-base)" }}>
                    {b._count.invoices}
                  </p>
                  <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                    Facturas
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => openEdit(b)}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase"
                  style={{ background: "var(--surface-highest)", color: "var(--text-base)" }}
                >
                  Editar
                </button>
                {b.active && (
                  <button
                    onClick={() => handleDelete(b)}
                    className="flex-1 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase"
                    style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
                  >
                    Desactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editBranch ? "Editar sucursal" : "Nueva sucursal"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre de la sucursal"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Matriz, Norte, Sur, Aeropuerto…"
            required
          />
          <Input
            label="Dirección (opcional)"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            placeholder="Av. Ejemplo 123, Ciudad"
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Guardando…" : editBranch ? "Guardar cambios" : "Crear sucursal"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
