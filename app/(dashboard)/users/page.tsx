"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Branch {
  id: string;
  nombre: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYED";
  active: boolean;
  branchId: string | null;
  branch: { id: string; nombre: string } | null;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: "EMPLOYED", label: "Empleado" },
  { value: "ADMIN", label: "Administrador" },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  EMPLOYED: "Empleado",
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "EMPLOYED" as "ADMIN" | "EMPLOYED",
  branchId: "",
};

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useCurrentUser();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Guard: redirect if not ADMIN
  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== "ADMIN") {
      router.replace("/");
    }
  }, [authLoading, currentUser, router]);

  async function loadData() {
    const [usersRes, branchesRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/branches"),
    ]);
    const [usersData, branchesData] = await Promise.all([
      usersRes.json(),
      branchesRes.json(),
    ]);
    if (usersData.success) setUsers(usersData.data);
    if (branchesData.success) setBranches(branchesData.data);
    setLoading(false);
  }

  useEffect(() => {
    if (currentUser?.role === "ADMIN") loadData();
  }, [currentUser]);

  function openCreate() {
    setEditUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      branchId: u.branchId ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        branchId: form.branchId || null,
      };
      if (!editUser || form.password) payload.password = form.password;

      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);
      success(editUser ? "Usuario actualizado" : "Usuario creado");
      setModalOpen(false);
      loadData();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(u: UserRow) {
    if (!confirm(`¿Desactivar usuario "${u.name}"?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      success("Usuario desactivado");
      loadData();
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

  const branchOptions = [
    { value: "", label: "Sin sucursal asignada" },
    ...branches.map((b) => ({ value: b.id, label: b.nombre })),
  ];

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--surface)" }}>
      <Header
        title="Usuarios"
        subtitle={`${users.length} usuario${users.length !== 1 ? "s" : ""} en tu empresa`}
        action={
          <Button onClick={openCreate}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo usuario
          </Button>
        }
      />

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "2px solid var(--surface-highest)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--surface-highest)" }}>
              {["Nombre", "Email", "Rol", "Sucursal", "Estado", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[9px] font-bold tracking-[0.15em] uppercase"
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                      style={{ color: "var(--text-muted)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                      No hay usuarios aún
                    </p>
                    <button
                      onClick={openCreate}
                      className="text-xs font-bold underline"
                      style={{ color: "var(--primary-focus)" }}
                    >
                      Crear el primero
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    background: i % 2 === 0 ? "var(--surface-white)" : "var(--surface)",
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-base)" }}>
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span
                        className="ml-2 text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
                        style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
                      >
                        Tú
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded"
                      style={
                        u.role === "ADMIN"
                          ? { background: "var(--primary)", color: "var(--on-primary)" }
                          : { background: "var(--surface-highest)", color: "var(--text-muted)" }
                      }
                    >
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {u.branch?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded"
                      style={
                        u.active
                          ? { background: "var(--success-bg)", color: "var(--success-text)" }
                          : { background: "var(--error-bg)", color: "var(--error-text)" }
                      }
                    >
                      {u.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs font-bold underline"
                        style={{ color: "var(--primary-focus)" }}
                      >
                        Editar
                      </button>
                      {u.id !== currentUser?.id && u.active && (
                        <button
                          onClick={() => handleDeactivate(u)}
                          className="text-xs font-bold underline"
                          style={{ color: "var(--error-text)" }}
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? "Editar usuario" : "Nuevo usuario"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label={editUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editUser}
          />
          <Select
            label="Rol"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "EMPLOYED" })}
            options={ROLE_OPTIONS}
          />
          <Select
            label="Sucursal"
            value={form.branchId}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            options={branchOptions}
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Guardando…" : editUser ? "Guardar cambios" : "Crear usuario"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
