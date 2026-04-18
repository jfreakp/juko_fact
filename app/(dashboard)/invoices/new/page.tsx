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
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-base)" }}>Sin resultados</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>No se encontró &ldquo;{query}&rdquo;</p>
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
    ? products.filter(
        (p) =>
          p.descripcion.toLowerCase().includes(query.toLowerCase()) ||
          p.codigoPrincipal.toLowerCase().includes(query.toLowerCase())
      )
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
  const [montoPagado, setMontoPagado] = useState("");
  const [metodoPago, setMetodoPago] = useState<"01" | "17" | "19">("01");

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
  const montoPagadoNum = Math.round((parseFloat(montoPagado) || 0) * 100) / 100;
  const vuelto = Math.round((montoPagadoNum - totalFactura) * 100) / 100;
  const isInsuficiente = montoPagadoNum > 0 && montoPagadoNum < totalFactura;
  const canFinish = montoPagado !== "" && montoPagadoNum >= totalFactura;

  function handleMontoPagadoChange(value: string) {
    // Allow only valid numeric input with up to 2 decimal places
    if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
      setMontoPagado(value);
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
          montoPagado === ""
            ? "Ingrese el monto pagado por el cliente"
            : "Monto insuficiente para cubrir el total de la factura"
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
          formaPago: metodoPago,
          montoPagado: montoPagadoNum,
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

              {/* Método de pago */}
              <div>
                <p className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text-muted)" }}>
                  Método
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { code: "01", label: "Efectivo" },
                      { code: "17", label: "Transfer." },
                      { code: "19", label: "Tarjeta" },
                    ] as const
                  ).map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setMetodoPago(code)}
                      className="py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-colors"
                      style={
                        metodoPago === code
                          ? { background: "var(--primary)", color: "var(--on-primary)", border: "2px solid var(--primary-dim)" }
                          : { background: "var(--surface-low)", color: "var(--text-muted)", border: "2px solid var(--border-subtle)" }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto pagado */}
              <div>
                <p className="text-[9px] font-bold tracking-widest uppercase mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Monto pagado
                </p>
                <div className="relative">
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
                    value={montoPagado}
                    onChange={(e) => handleMontoPagadoChange(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg text-sm font-bold text-right outline-none transition-colors"
                    style={{
                      background: "var(--surface-white)",
                      border: isInsuficiente
                        ? "2px solid var(--error-strong)"
                        : montoPagado && canFinish
                        ? "2px solid #22a55b"
                        : "2px solid var(--border-subtle)",
                      color: "var(--text-base)",
                    }}
                    onFocus={(e) => {
                      if (!isInsuficiente && !(montoPagado && canFinish))
                        e.currentTarget.style.borderColor = "var(--primary-focus)";
                    }}
                    onBlur={(e) => {
                      if (!isInsuficiente && !(montoPagado && canFinish))
                        e.currentTarget.style.borderColor = "var(--border-subtle)";
                    }}
                  />
                </div>

                {/* Quick buttons */}
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setMontoPagado(totalFactura.toFixed(2))}
                    className="flex-1 py-1 rounded-md text-[9px] font-bold tracking-wide transition-colors"
                    style={{
                      background: "var(--surface-low)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-subtle)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--surface-highest)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-base)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--surface-low)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    }}
                  >
                    Exacto
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMontoPagado(Math.ceil(totalFactura).toFixed(2))
                    }
                    className="flex-1 py-1 rounded-md text-[9px] font-bold tracking-wide transition-colors"
                    style={{
                      background: "var(--surface-low)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-subtle)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--surface-highest)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-base)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--surface-low)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    }}
                  >
                    Redondear $
                  </button>
                </div>
              </div>

              {/* Vuelto */}
              <div
                className="flex items-center justify-between rounded-lg px-3 py-2.5"
                style={{
                  background: isInsuficiente
                    ? "var(--error-bg)"
                    : montoPagado && canFinish
                    ? "#dcfce7"
                    : "var(--surface-low)",
                }}
              >
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{
                    color: isInsuficiente
                      ? "var(--error-text)"
                      : montoPagado && canFinish
                      ? "#166534"
                      : "var(--text-muted)",
                  }}
                >
                  {isInsuficiente ? "Monto insuficiente" : "Vuelto"}
                </span>
                <span
                  className="text-sm font-black"
                  style={{
                    color: isInsuficiente
                      ? "var(--error-strong)"
                      : montoPagado && canFinish
                      ? "#166534"
                      : "var(--text-muted)",
                  }}
                >
                  {isInsuficiente
                    ? `-$${Math.abs(vuelto).toFixed(2)}`
                    : montoPagado
                    ? `$${vuelto.toFixed(2)}`
                    : "—"}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-5"
              size="lg"
              loading={saving}
              disabled={saving || (montoPagado !== "" && !canFinish)}
            >
              {isInsuficiente ? "Monto insuficiente" : "Finalizar Factura"}
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
