"use client";

import React, { useEffect, useState, useRef, FormEvent, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
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
  isFavorite: boolean;
  codigoBarras: string | null;
  unidadMedida: string;
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

const IVA_RATE = Number(process.env.NEXT_PUBLIC_IVA_RATE ?? 15);

const IVA_OPTIONS = [
  { value: "IVA_0", label: "0%" },
  { value: "IVA_STANDARD", label: `${IVA_RATE}%` },
];

const IVA_RATES: Record<string, number> = {
  IVA_0: 0,
  IVA_5: 5,
  IVA_STANDARD: IVA_RATE,
  NO_APLICA: 0,
};

const IVA_LABEL: Record<string, string> = {
  IVA_0: "0%",
  IVA_5: "5%",
  IVA_STANDARD: `${IVA_RATE}%`,
  NO_APLICA: "N/A",
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
    tipoIva: "IVA_STANDARD",
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

const TIPO_IDENTIF_LABEL: Record<string, string> = {
  CEDULA: "CI",
  RUC: "RUC",
  PASAPORTE: "PAS",
  CONSUMIDOR_FINAL: "CF",
};

// ── Add Client Modal ─────────────────────────────────────────────────────────
interface AddClientModalProps {
  initialIdentificacion: string;
  onClose: () => void;
  onCreated: (client: Client) => void;
}

function detectTipoIdentif(id: string): "CEDULA" | "RUC" | "PASAPORTE" {
  const clean = id.replace(/\D/g, "");
  if (clean.length === 10) return "CEDULA";
  if (clean.length === 13) return "RUC";
  return "PASAPORTE";
}

function AddClientModal({ initialIdentificacion, onClose, onCreated }: AddClientModalProps) {
  const [identificacion, setIdentificacion] = useState(initialIdentificacion);
  const [tipoIdentif, setTipoIdentif] = useState<"CEDULA" | "RUC" | "PASAPORTE">(
    detectTipoIdentif(initialIdentificacion)
  );
  const [razonSocial, setRazonSocial] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [searching, setSearching] = useState(false);
  const [sriMsg, setSriMsg] = useState<{ type: "ok" | "warn" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { error: toastError } = useToast();

  async function buscarSRI() {
    const id = identificacion.trim();
    if (!id) return;
    setSearching(true);
    setSriMsg(null);
    try {
      const res = await fetch(`/api/sri/contribuyente?identificacion=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!data.success) {
        setSriMsg({ type: "err", text: data.error ?? "Error al consultar el SRI" });
        return;
      }
      const contrib = data.data?.contribuyente;
      const nombre: string = contrib?.nombreComercial ?? contrib?.denominacion ?? "";
      if (nombre) {
        setRazonSocial(nombre);
        setSriMsg({ type: "ok", text: `Contribuyente encontrado: ${nombre}` });
      } else {
        setSriMsg({ type: "warn", text: "No se encontró nombre en el SRI. Ingrese la razón social manualmente." });
      }
      // Auto-detectar tipo por longitud real
      setTipoIdentif(detectTipoIdentif(id));
    } catch {
      setSriMsg({ type: "err", text: "No se pudo conectar con el SRI" });
    } finally {
      setSearching(false);
    }
  }

  async function handleSave() {
    const id = identificacion.trim();
    const nombre = razonSocial.trim();
    if (!id) { setSaveError("La identificación es requerida"); return; }
    if (!nombre) { setSaveError("La razón social es requerida"); return; }
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoIdentif,
          identificacion: id,
          razonSocial: nombre,
          email: email.trim() || undefined,
          telefono: telefono.trim() || undefined,
          direccion: direccion.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setSaveError(data.error ?? "Error al guardar");
        return;
      }
      onCreated({
        id: data.data.id,
        razonSocial: data.data.razonSocial,
        identificacion: data.data.identificacion,
        tipoIdentif: data.data.tipoIdentif,
      });
    } catch {
      toastError("Error de conexión al guardar el cliente");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-white)",
    color: "var(--text-base)",
    border: "2px solid var(--border-subtle)",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 600,
    outline: "none",
    width: "100%",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    display: "block",
    marginBottom: "4px",
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--surface-white)",
          border: "2px solid var(--border-strong)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-base)", margin: 0 }}>
              Agregar cliente
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Busca en el SRI por cédula o RUC para obtener el nombre
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "none",
              background: "var(--surface-low)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Identificación + Buscar SRI */}
          <div>
            <label style={labelStyle}>Cédula / RUC / Pasaporte</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Ej: 1105989576001"
                value={identificacion}
                onChange={(e) => {
                  setIdentificacion(e.target.value);
                  setTipoIdentif(detectTipoIdentif(e.target.value));
                  setSriMsg(null);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarSRI(); } }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
              />
              <button
                type="button"
                onClick={buscarSRI}
                disabled={searching || !identificacion.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: "2px solid var(--primary-dim)",
                  background: "var(--primary)",
                  color: "var(--on-primary)",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: searching || !identificacion.trim() ? "not-allowed" : "pointer",
                  opacity: searching || !identificacion.trim() ? 0.6 : 1,
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {searching && (
                  <svg className="animate-spin" style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                Consultar SRI
              </button>
            </div>

            {/* SRI feedback message */}
            {sriMsg && (
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  background:
                    sriMsg.type === "ok"
                      ? "var(--success-bg)"
                      : sriMsg.type === "warn"
                      ? "#fefce8"
                      : "var(--error-bg)",
                  color:
                    sriMsg.type === "ok"
                      ? "var(--success-text)"
                      : sriMsg.type === "warn"
                      ? "#854d0e"
                      : "var(--error-text)",
                  border: `1px solid ${
                    sriMsg.type === "ok"
                      ? "var(--success-text)"
                      : sriMsg.type === "warn"
                      ? "#fde047"
                      : "var(--error-strong)"
                  }`,
                }}
              >
                {sriMsg.text}
              </div>
            )}
          </div>

          {/* Tipo identificación */}
          <div>
            <label style={labelStyle}>Tipo de identificación</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={tipoIdentif}
              onChange={(e) => setTipoIdentif(e.target.value as "CEDULA" | "RUC" | "PASAPORTE")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            >
              <option value="CEDULA">Cédula</option>
              <option value="RUC">RUC</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </div>

          {/* Razón social */}
          <div>
            <label style={labelStyle}>Razón social / Nombre *</label>
            <input
              style={inputStyle}
              placeholder="Nombre del cliente"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <input
              type="email"
              style={inputStyle}
              placeholder="cliente@email.com (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />
          </div>

          {/* Teléfono + Dirección (2 cols) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input
                style={inputStyle}
                placeholder="0999999999"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
              />
            </div>
            <div>
              <label style={labelStyle}>Dirección</label>
              <input
                style={inputStyle}
                placeholder="Dirección (opcional)"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
              />
            </div>
          </div>

          {saveError && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                background: "var(--error-bg)",
                color: "var(--error-text)",
                border: "1px solid var(--error-strong)",
              }}
            >
              {saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "2px solid var(--border-subtle)",
              background: "var(--surface-low)",
              color: "var(--text-muted)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              border: "2px solid var(--primary-dim)",
              background: saving ? "var(--surface-highest)" : "var(--primary)",
              color: saving ? "var(--text-muted)" : "var(--on-primary)",
              fontSize: 12,
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {saving && (
              <svg className="animate-spin" style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            Guardar cliente
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Client Picker ────────────────────────────────────────────────────────────
interface ClientPickerProps {
  value: Client | null;
  onChange: (c: Client | null) => void;
}

function ClientPicker({ value, onChange }: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [fetching, setFetching] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (query.length === 0) { setResults([]); return; }
      setFetching(true);
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) { setResults(data.data); setCursor(0); }
      } finally {
        setFetching(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  function calcDropdownPosition() {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const minH = 200;
    const maxH = 340;
    const openUpward = spaceBelow < minH && spaceAbove > spaceBelow;
    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 420),
      zIndex: 9999,
      maxHeight: `${Math.min(maxH, openUpward ? spaceAbove - 8 : spaceBelow - 8)}px`,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }

  function openDropdown() {
    calcDropdownPosition();
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    function reposition() { calcDropdownPosition(); }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[cursor]) pick(results[cursor]); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); }
  }

  function pick(c: Client) {
    onChange(c);
    setOpen(false);
    setQuery("");
    setResults([]);
    setCursor(0);
  }

  // Selected chip
  if (value) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{ background: "var(--primary)", border: "2px solid var(--primary-dim)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black"
          style={{ background: "var(--on-primary)", color: "var(--primary)" }}
        >
          {value.razonSocial.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black truncate" style={{ color: "var(--on-primary)" }}>
            {value.razonSocial}
          </p>
          <p className="text-[10px] font-bold" style={{ color: "var(--on-primary)", opacity: 0.65 }}>
            {TIPO_IDENTIF_LABEL[value.tipoIdentif] ?? value.tipoIdentif} · {value.identificacion}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-sm font-black"
          style={{ background: "rgba(0,0,0,0.15)", color: "var(--on-primary)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.3)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.15)")}
          title="Cambiar cliente"
        >
          ×
        </button>
      </div>
    );
  }

  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={{
        ...dropdownStyle,
        background: "var(--surface-white)",
        border: "2px solid var(--border-strong)",
        borderRadius: "12px",
        overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* Search input header */}
      <div
        className="sticky top-0 px-3 py-2.5 flex items-center gap-2"
        style={{ background: "var(--surface-low)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          style={{ color: "var(--text-muted)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none text-sm font-medium"
          style={{ color: "var(--text-base)" }}
          placeholder="Cédula, RUC o nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {fetching && (
          <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"
            style={{ color: "var(--text-muted)" }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </div>

      {query.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Escribe la cédula, RUC o nombre del cliente
          </p>
        </div>
      ) : fetching && results.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Buscando...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>Sin resultados</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>No se encontró &ldquo;{query}&rdquo;</p>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-colors"
            style={{
              background: "var(--primary)",
              color: "var(--on-primary)",
              border: "2px solid var(--primary-dim)",
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar cliente nuevo
          </button>
        </div>
      ) : (
        results.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
            style={{
              background: i === cursor ? "var(--surface-low)" : "transparent",
              borderBottom: "1px solid var(--surface-highest)",
            }}
            onMouseEnter={() => setCursor(i)}
            onMouseDown={(e) => { e.preventDefault(); pick(c); }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black"
              style={{ background: "var(--primary)", color: "var(--on-primary)" }}
            >
              {c.razonSocial.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: "var(--text-base)" }}>
                {c.razonSocial}
              </p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                {c.identificacion}
              </p>
            </div>
            <span
              className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: "var(--info-bg)", color: "var(--info-text)" }}
            >
              {TIPO_IDENTIF_LABEL[c.tipoIdentif] ?? c.tipoIdentif}
            </span>
          </button>
        ))
      )}
    </div>
  );

  return (
    <>
      <div ref={containerRef} className="relative">
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-text"
          style={{
            background: "var(--surface-white)",
            border: open ? "2px solid var(--primary-focus)" : "2px solid var(--border-subtle)",
          }}
          onClick={openDropdown}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Buscar cliente por cédula o nombre...
          </span>
          <svg
            className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
            style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {open && mounted && createPortal(dropdownContent, document.body)}
      </div>

      {showAddModal && mounted && (
        <AddClientModal
          initialIdentificacion={query}
          onClose={() => setShowAddModal(false)}
          onCreated={(client) => {
            onChange(client);
            setShowAddModal(false);
            setQuery("");
            setResults([]);
          }}
        />
      )}
    </>
  );
}

// ── Product Picker ──────────────────────────────────────────────────────────
interface ProductPickerProps {
  products: Product[];
  selected: Product | undefined;
  onSelect: (p: Product) => void;
  onClear: () => void;
}

function ProductPicker({ products, selected, onSelect, onClear }: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure portal target exists (SSR safety)
  useEffect(() => { setMounted(true); }, []);

  const filtered = query
    ? products.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.descripcion.toLowerCase().includes(q) ||
          p.codigoPrincipal.toLowerCase().includes(q) ||
          (p.codigoBarras?.toLowerCase().includes(q) ?? false)
        );
      })
    : products;

  function calcDropdownPosition() {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Minimum height to show 5 items (~52px each) + padding
    const minH = Math.min(5, filtered.length || 1) * 52 + 16;
    const maxH = 340;
    // Flip upward if not enough space below
    const openUpward = spaceBelow < minH && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 440),
      zIndex: 9999,
      maxHeight: `${Math.min(maxH, openUpward ? spaceAbove - 8 : spaceBelow - 8)}px`,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }

  function openDropdown() {
    calcDropdownPosition();
    setOpen(true);
    setCursor(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Close on outside click (account for portal being outside containerRef)
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on scroll or resize
  useEffect(() => {
    if (!open) return;
    function handleScrollResize() {
      calcDropdownPosition(); // reposition on scroll
    }
    window.addEventListener("scroll", handleScrollResize, true);
    window.addEventListener("resize", handleScrollResize);
    return () => {
      window.removeEventListener("scroll", handleScrollResize, true);
      window.removeEventListener("resize", handleScrollResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered.length]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[cursor]) pick(filtered[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  function pick(p: Product) {
    onSelect(p);
    setOpen(false);
    setQuery("");
    setCursor(0);
  }

  // If a product is selected, show a chip
  if (selected) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{
          background: "var(--primary)",
          border: "2px solid var(--primary-dim)",
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black"
          style={{ background: "var(--on-primary)", color: "var(--primary)" }}
        >
          {selected.descripcion.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black truncate" style={{ color: "var(--on-primary)" }}>
            {selected.descripcion}
          </p>
          <p className="text-[10px] font-bold" style={{ color: "var(--on-primary)", opacity: 0.65 }}>
            {selected.codigoPrincipal} · ${Number(selected.precio).toFixed(2)} · IVA {IVA_LABEL[selected.tipoIva]}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-sm font-black"
          style={{ background: "rgba(0,0,0,0.15)", color: "var(--on-primary)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.3)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.15)")}
          title="Cambiar producto"
        >
          ×
        </button>
      </div>
    );
  }

  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={{
        ...dropdownStyle,
        background: "var(--surface-white)",
        border: "2px solid var(--border-strong)",
        borderRadius: "12px",
        overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* Search header */}
      <div
        className="sticky top-0 px-3 py-2.5 flex items-center gap-2"
        style={{
          background: "var(--surface-low)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          style={{ color: "var(--text-muted)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>Sin resultados</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            No se encontró &ldquo;{query}&rdquo;
          </p>
        </div>
      ) : (
        filtered.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
            style={{
              background: i === cursor ? "var(--surface-low)" : "transparent",
              borderBottom: "1px solid var(--surface-highest)",
            }}
            onMouseEnter={() => setCursor(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              pick(p);
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black"
              style={{ background: "var(--primary)", color: "var(--on-primary)" }}
            >
              {p.descripcion.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--text-base)" }}>
                {p.descripcion}
              </p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                Código: {p.codigoPrincipal}
              </p>
            </div>
            <div className="text-right flex-shrink-0 space-y-1">
              <p className="text-sm font-black" style={{ color: "var(--text-base)" }}>
                ${Number(p.precio).toFixed(2)}
              </p>
              <span
                className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
                style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
              >
                {IVA_LABEL[p.tipoIva]}
              </span>
            </div>
          </button>
        ))
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger / search input */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-text"
        style={{
          background: "var(--surface-white)",
          border: open ? "2px solid var(--primary-focus)" : "2px solid var(--border-subtle)",
        }}
        onClick={openDropdown}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          style={{ color: "var(--text-muted)" }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none text-sm font-medium"
          style={{ color: "var(--text-base)" }}
          placeholder="Buscar o seleccionar producto..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
            if (!open) openDropdown();
          }}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
        />
        <svg
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Portal dropdown — renders directly in body, escapes any overflow:hidden parents */}
      {open && mounted && createPortal(dropdownContent, document.body)}
    </div>
  );
}

// ── Favorites Bar ────────────────────────────────────────────────────────────
interface FavoritesBarProps {
  favorites: Product[];
  onAdd: (p: Product) => void;
}

function FavoritesBar({ favorites, onAdd }: FavoritesBarProps) {
  const [collapsed, setCollapsed] = useState(favorites.length === 0);

  if (favorites.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden mb-6"
      style={{ background: "var(--surface-white)", border: "2px solid #FFD700" }}
    >
      <button
        type="button"
        className="w-full px-5 py-3 flex items-center gap-2 text-left"
        style={{ borderBottom: collapsed ? "none" : "1px solid var(--surface-highest)" }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="text-base leading-none" style={{ color: "#FFD700" }}>★</span>
        <span
          className="text-[10px] font-bold tracking-[0.15em] uppercase flex-1"
          style={{ color: "var(--text-muted)" }}
        >
          Favoritos · {favorites.length} {favorites.length === 1 ? "producto" : "productos"} · clic para agregar
        </span>
        <svg
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
          style={{ color: "var(--text-muted)", transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-5 py-3 flex flex-wrap gap-2">
          {favorites.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onAdd(p)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors"
              style={{
                background: "var(--surface-low)",
                border: "2px solid var(--border-subtle)",
                color: "var(--text-base)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#FFD700";
                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                (e.currentTarget as HTMLElement).style.background = "var(--surface-low)";
              }}
              title={`${p.descripcion} · $${Number(p.precio).toFixed(2)} · IVA ${IVA_LABEL[p.tipoIva]}`}
            >
              <span style={{ color: "#FFD700" }}>★</span>
              <span className="max-w-[160px] truncate">{p.descripcion}</span>
              <span
                className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
                style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
              >
                ${Number(p.precio).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function NewInvoicePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [observaciones, setObservaciones] = useState("");
  const [lines, setLines] = useState<DetailLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  type PagoCode = "01" | "16" | "17" | "19";
  type PagoEntry = {
    id: string;
    formaPago: PagoCode;
    monto: string;
    plazo?: string;
    unidadTiempo?: string;
  };
  const [pagos, setPagos] = useState<PagoEntry[]>([
    { id: crypto.randomUUID(), formaPago: "01", monto: "" },
  ]);

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then((p) => {
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
    const alreadyInOtherLine = lines.some(
      (l) => l.id !== lineId && l.productId === product.id
    );
    if (alreadyInOtherLine) {
      toastError(`"${product.descripcion}" ya está en el detalle`);
      return;
    }
    updateLine(lineId, {
      productId: product.id,
      codigoPrincipal: product.codigoPrincipal,
      descripcion: product.descripcion,
      precioUnitario: String(product.precio),
      tipoIva: product.tipoIva,
    });
  }

  function addFavoriteProduct(product: Product) {
    if (lines.some((l) => l.productId === product.id)) {
      toastError(`"${product.descripcion}" ya está en el detalle`);
      return;
    }
    const emptyIndex = lines.findIndex((l) => !l.productId && !l.descripcion);
    if (emptyIndex !== -1) {
      setLines((prev) =>
        prev.map((l, i) =>
          i === emptyIndex
            ? { ...l, productId: product.id, codigoPrincipal: product.codigoPrincipal, descripcion: product.descripcion, precioUnitario: String(product.precio), tipoIva: product.tipoIva }
            : l
        )
      );
    } else {
      const newLine = emptyLine();
      newLine.productId = product.id;
      newLine.codigoPrincipal = product.codigoPrincipal;
      newLine.descripcion = product.descripcion;
      newLine.precioUnitario = String(product.precio);
      newLine.tipoIva = product.tipoIva;
      setLines((prev) => [...prev, newLine]);
    }
  }

  function clearProduct(lineId: string) {
    updateLine(lineId, {
      productId: undefined,
      codigoPrincipal: "",
      descripcion: "",
      precioUnitario: "0.00",
      tipoIva: "IVA_STANDARD",
    });
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

  const totalFactura = Math.round(totals.total * 100) / 100;
  const sumaPagos = Math.round(pagos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0) * 100) / 100;
  const pendiente = Math.round((totalFactura - sumaPagos) * 100) / 100;
  const hayCash = pagos.some((p) => p.formaPago === "01");
  // canFinish: suma exacta, O bien suma >= total con efectivo (el exceso es vuelto)
  const canFinish = pagos.every((p) => p.monto !== "") &&
    (Math.abs(pendiente) < 0.01 || (pendiente < 0 && hayCash));


  const METODOS: { code: PagoCode; label: string }[] = [
    { code: "01", label: "Efectivo" },
    { code: "17", label: "Transferencia" },
    { code: "16", label: "Tarjeta" },
    { code: "19", label: "Crédito" },
  ];

  function addPago() {
    setPagos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), formaPago: "01", monto: "" },
    ]);
  }

  function removePago(id: string) {
    setPagos((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }

  function updatePago(id: string, updates: Partial<PagoEntry>) {
    setPagos((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  function setPagoMonto(id: string, value: string) {
    if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
      updatePago(id, { monto: value });
    }
  }

  function completarConPendiente(id: string) {
    if (pendiente > 0) {
      updatePago(id, { monto: pendiente.toFixed(2) });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedClient) {
      toastError("Seleccione un cliente");
      return;
    }
    if (lines.some((l) => !l.descripcion || !l.codigoPrincipal)) {
      toastError("Seleccione un producto en cada línea");
      return;
    }

    setSaving(true);
    try {
      if (!canFinish) {
        toastError(
          pagos.every((p) => p.monto === "")
            ? "Ingrese los montos de pago"
            : `Pendiente por cubrir: $${pendiente.toFixed(2)}`
        );
        return;
      }

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          fechaEmision,
          observaciones,
          // Para el SRI: recortar el efectivo al monto exacto necesario
          // (el exceso es vuelto al cliente — no va en el XML)
          pagos: (() => {
            let restante = totalFactura;
            return pagos
              .filter((p) => p.monto !== "")
              .map((p) => {
                const raw = parseFloat(p.monto) || 0;
                const base = p.formaPago === "01"
                  ? (() => {
                      const monto = Math.round(Math.min(raw, Math.max(0, restante)) * 100) / 100;
                      restante = Math.round((restante - monto) * 100) / 100;
                      return { formaPago: p.formaPago, monto };
                    })()
                  : (() => {
                      restante = Math.round((restante - raw) * 100) / 100;
                      return { formaPago: p.formaPago, monto: raw };
                    })();
                // Incluir plazo/unidadTiempo solo para crédito (código 19)
                if (p.formaPago === "19") {
                  return {
                    ...base,
                    plazo: parseInt(p.plazo || "30") || 30,
                    unidadTiempo: p.unidadTiempo || "dias",
                  };
                }
                return base;
              })
              .filter((p) => p.monto > 0);
          })(),
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
      router.push("/invoices");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al crear factura");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    background: "var(--surface-white)",
    color: "var(--text-base)",
    border: "2px solid var(--border-subtle)",
  };

  return (
    <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
      <Header
        title="Nueva Factura"
        subtitle="Crear comprobante electrónico"
        action={
          <Button variant="ghost" onClick={() => router.back()}>
            ← Volver
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left: client + fecha + observaciones */}
          <div
            className="lg:col-span-2 rounded-xl p-6 space-y-4"
            style={{ background: "var(--surface-white)" }}
          >
            <p
              className="text-[10px] font-bold tracking-[0.15em] uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              Datos del Comprobante
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label
                  className="text-[11px] font-bold tracking-widest uppercase block mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Cliente
                </label>
                <ClientPicker value={selectedClient} onChange={setSelectedClient} />
              </div>
              <Input
                label="Fecha de Emisión"
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
              />
            </div>
            <div>
              <label
                className="text-[11px] font-bold tracking-widest uppercase block mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Observaciones
              </label>
              <textarea
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium resize-none outline-none transition-colors"
                style={inputStyle}
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones adicionales (opcional)"
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
              />
            </div>
          </div>

          {/* Right: totals + payment + submit */}
          <div className="rounded-xl p-6" style={{ background: "var(--surface-white)" }}>
            <p
              className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Resumen
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                <span className="font-semibold" style={{ color: "var(--text-base)" }}>
                  ${totals.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--text-muted)" }}>IVA</span>
                <span className="font-semibold" style={{ color: "var(--text-base)" }}>
                  ${totals.iva.toFixed(2)}
                </span>
              </div>
              <div
                className="pt-3 flex justify-between"
                style={{ borderTop: "2px solid var(--surface-highest)" }}
              >
                <span
                  className="font-black tracking-widest uppercase text-xs"
                  style={{ color: "var(--text-base)" }}
                >
                  Total
                </span>
                <span className="font-black text-xl" style={{ color: "var(--primary-focus)" }}>
                  ${totalFactura.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment section */}
            <div
              className="mt-5 pt-5 space-y-4"
              style={{ borderTop: "2px solid var(--surface-highest)" }}
            >
              <p
                className="text-[10px] font-bold tracking-[0.15em] uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                Pago
              </p>

              {/* Filas de pago */}
              <div className="space-y-2">
                {pagos.map((pago, idx) => (
                  <div key={pago.id} className="space-y-1.5">
                    {/* Selector de método */}
                    <div className="grid grid-cols-4 gap-1">
                      {METODOS.map(({ code, label }) => {
                        const usadoEnOtraFila = pagos.some((p) => p.id !== pago.id && p.formaPago === code);
                        const activo = pago.formaPago === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            disabled={usadoEnOtraFila}
                            onClick={() => updatePago(pago.id, { formaPago: code })}
                            className="py-1 rounded-md text-[9px] font-bold tracking-wide transition-colors"
                            style={
                              activo
                                ? { background: "var(--primary)", color: "var(--on-primary)", border: "2px solid var(--primary-dim)" }
                                : usadoEnOtraFila
                                ? { background: "var(--surface-low)", color: "var(--border-subtle)", border: "2px solid var(--border-subtle)", cursor: "not-allowed", opacity: 0.4 }
                                : { background: "var(--surface-low)", color: "var(--text-muted)", border: "2px solid var(--border-subtle)" }
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Campos de plazo (solo para Crédito) */}
                    {pago.formaPago === "19" && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label
                            className="text-[9px] font-bold tracking-[0.12em] uppercase block mb-1"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Plazo
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="30"
                            value={pago.plazo ?? ""}
                            onChange={(e) => updatePago(pago.id, { plazo: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg text-sm font-medium outline-none transition-colors"
                            style={{
                              background: "var(--surface-white)",
                              border: "2px solid var(--border-subtle)",
                              color: "var(--text-base)",
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                          />
                        </div>
                        <div>
                          <label
                            className="text-[9px] font-bold tracking-[0.12em] uppercase block mb-1"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Unidad
                          </label>
                          <select
                            value={pago.unidadTiempo ?? "dias"}
                            onChange={(e) => updatePago(pago.id, { unidadTiempo: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg text-sm font-medium"
                            style={{
                              background: "var(--surface-white)",
                              border: "2px solid var(--border-subtle)",
                              color: "var(--text-base)",
                            }}
                          >
                            <option value="dias">Días</option>
                            <option value="meses">Meses</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Input monto + quitar */}
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <span
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                          style={{ color: "var(--text-muted)" }}
                        >
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={pago.monto}
                          onChange={(e) => setPagoMonto(pago.id, e.target.value)}
                          className="w-full pl-7 pr-3 py-2 rounded-lg text-sm font-bold text-right outline-none transition-colors"
                          style={{
                            background: "var(--surface-white)",
                            border: "2px solid var(--border-subtle)",
                            color: "var(--text-base)",
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary-focus)"; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                        />
                      </div>
                      {/* Botón exacto (rellena con pendiente) */}
                      {pendiente > 0 && (
                        <button
                          type="button"
                          onClick={() => completarConPendiente(pago.id)}
                          className="px-2.5 rounded-lg text-[9px] font-bold tracking-wide transition-colors"
                          style={{ background: "var(--surface-low)", color: "var(--text-muted)", border: "2px solid var(--border-subtle)" }}
                          title={`Completar con $${pendiente.toFixed(2)}`}
                        >
                          Exacto
                        </button>
                      )}
                      {/* Quitar fila */}
                      {pagos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePago(pago.id)}
                          className="px-2.5 rounded-lg text-[11px] font-bold transition-colors"
                          style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "2px solid transparent" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Separador entre filas */}
                    {idx < pagos.length - 1 && (
                      <div style={{ borderTop: "1px solid var(--surface-highest)", marginTop: "4px" }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Agregar método */}
              <button
                type="button"
                onClick={addPago}
                className="w-full py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-colors"
                style={{ background: "var(--surface-low)", color: "var(--text-muted)", border: "2px dashed var(--border-subtle)" }}
              >
                + Agregar método de pago
              </button>

              {/* Estado del pago */}
              {(() => {
                const vuelto = canFinish && pendiente < -0.01 ? Math.abs(pendiente) : 0;
                const excedenteSinCash = pendiente < -0.01 && !hayCash;
                const faltan = pendiente > 0.01;
                const bg  = canFinish ? "#dcfce7" : excedenteSinCash ? "#fef9c3" : faltan && sumaPagos > 0 ? "var(--error-bg)" : "var(--surface-low)";
                const clr = canFinish ? "#166534" : excedenteSinCash ? "#854d0e" : faltan && sumaPagos > 0 ? "var(--error-strong)" : "var(--text-muted)";
                const label = vuelto > 0 ? "Vuelto" : canFinish ? "Cubierto" : excedenteSinCash ? "Excedente" : "Pendiente";
                const value = vuelto > 0 ? `$${vuelto.toFixed(2)}` : canFinish ? "✓" : excedenteSinCash ? `+$${Math.abs(pendiente).toFixed(2)}` : sumaPagos > 0 ? `-$${pendiente.toFixed(2)}` : "—";
                return (
                  <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: bg }}>
                    <span className="text-xs font-bold tracking-widest uppercase" style={{ color: clr }}>{label}</span>
                    <span className="text-sm font-black" style={{ color: clr }}>{value}</span>
                  </div>
                );
              })()}
            </div>

            <Button
              type="submit"
              className="w-full mt-5"
              size="lg"
              loading={saving}
              disabled={saving || (sumaPagos > 0 && !canFinish)}
            >
              {!canFinish && pendiente < -0.01 && !hayCash
                ? `Excedente +$${Math.abs(pendiente).toFixed(2)}`
                : !canFinish && sumaPagos > 0
                ? `Faltan $${pendiente.toFixed(2)}`
                : "Finalizar Factura"}
            </Button>
          </div>
        </div>

        {/* Favorites quick-add bar */}
        <FavoritesBar
          favorites={products.filter((p) => p.isFavorite)}
          onAdd={addFavoriteProduct}
        />

        {/* Line items — card layout */}
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-white)" }}>
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--surface-highest)" }}
          >
            <div>
              <p
                className="text-[10px] font-bold tracking-[0.15em] uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                Productos / Servicios
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {lines.length} {lines.length === 1 ? "línea" : "líneas"} · ${totals.subtotal.toFixed(2)} subtotal
              </p>
            </div>
            <Button size="sm" variant="secondary" type="button" onClick={addLine}>
              + Agregar línea
            </Button>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--surface-highest)" }}>
            {lines.map((line, idx) => {
              const { subtotal } = calcLine(line);
              const selectedProduct = line.productId
                ? products.find((p) => p.id === line.productId)
                : undefined;

              return (
                <div
                  key={line.id}
                  className="p-5 space-y-3"
                  style={{ background: idx % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                >
                  {/* Row 1: line number + product picker + delete */}
                  <div className="flex items-start gap-3">
                    {/* Line number badge */}
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-2.5 text-[10px] font-black"
                      style={{ background: "var(--surface-highest)", color: "var(--text-muted)" }}
                    >
                      {idx + 1}
                    </div>

                    {/* Product picker */}
                    <div className="flex-1">
                      <ProductPicker
                        products={products}
                        selected={selectedProduct}
                        onSelect={(p) => selectProduct(line.id, p)}
                        onClear={() => clearProduct(line.id)}
                      />
                    </div>

                    {/* Delete line */}
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "var(--error-bg)";
                          (e.currentTarget as HTMLElement).style.color = "var(--error-text)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                        }}
                        title="Eliminar línea"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Row 2: description + numeric fields + subtotal */}
                  <div className="pl-9 grid grid-cols-12 gap-3 items-end">
                    {/* Description — read only */}
                    <div className="col-span-12 sm:col-span-4">
                      <label
                        className="text-[9px] font-bold tracking-[0.15em] uppercase block mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Descripción
                      </label>
                      <div
                        className="px-3 py-2 rounded-lg text-sm font-medium truncate"
                        style={{
                          background: "var(--surface-low)",
                          color: line.descripcion ? "var(--text-base)" : "var(--text-muted)",
                          border: "2px solid transparent",
                        }}
                        title={line.descripcion || "—"}
                      >
                        {line.descripcion || "—"}
                      </div>
                    </div>

                    {/* Cantidad — editable */}
                    <div className="col-span-4 sm:col-span-2">
                      <label
                        className="text-[9px] font-bold tracking-[0.15em] uppercase block mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Cantidad
                      </label>
                      <input
                        type="number" step="0.01" min="0.01"
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium text-right outline-none transition-colors"
                        style={inputStyle}
                        value={line.cantidad}
                        onChange={(e) => updateLine(line.id, { cantidad: e.target.value })}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                      />
                    </div>

                    {/* Precio unitario — read only */}
                    <div className="col-span-4 sm:col-span-2">
                      <label
                        className="text-[9px] font-bold tracking-[0.15em] uppercase block mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        P. Unitario
                      </label>
                      <div
                        className="px-3 py-2 rounded-lg text-sm font-medium text-right"
                        style={{
                          background: "var(--surface-low)",
                          color: "var(--text-base)",
                          border: "2px solid transparent",
                        }}
                      >
                        ${Number(line.precioUnitario || 0).toFixed(2)}
                      </div>
                    </div>

                    {/* Descuento — read only */}
                    <div className="col-span-4 sm:col-span-2">
                      <label
                        className="text-[9px] font-bold tracking-[0.15em] uppercase block mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Descuento
                      </label>
                      <div
                        className="px-3 py-2 rounded-lg text-sm font-medium text-right"
                        style={{
                          background: "var(--surface-low)",
                          color: "var(--text-base)",
                          border: "2px solid transparent",
                        }}
                      >
                        ${Number(line.descuento || 0).toFixed(2)}
                      </div>
                    </div>

                    {/* IVA — read only */}
                    <div className="col-span-6 sm:col-span-1">
                      <label
                        className="text-[9px] font-bold tracking-[0.15em] uppercase block mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        IVA
                      </label>
                      <div
                        className="px-2 py-2 rounded-lg text-xs font-bold text-center"
                        style={{
                          background: "var(--surface-low)",
                          color: "var(--text-base)",
                          border: "2px solid transparent",
                        }}
                      >
                        {IVA_LABEL[line.tipoIva] ?? "—"}
                      </div>
                    </div>

                    {/* Subtotal — read only display */}
                    <div className="col-span-6 sm:col-span-1">
                      <label
                        className="text-[9px] font-bold tracking-[0.15em] uppercase block mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Subtotal
                      </label>
                      <div
                        className="px-3 py-2 rounded-lg text-sm font-black text-right"
                        style={{
                          background: "var(--surface-low)",
                          color: "var(--text-base)",
                          border: "2px solid transparent",
                        }}
                      >
                        ${subtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add line button (bottom shortcut) */}
          <div className="px-5 py-3" style={{ borderTop: "1px solid var(--surface-highest)" }}>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-base)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar otra línea
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
