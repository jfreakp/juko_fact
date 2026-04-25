"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useBusinessType } from "@/lib/business-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockAlert {
  id: string;
  cantidad: string;
  stockMinimo: string;
  branch: { nombre: string };
  inventoryProduct: {
    product: { codigoPrincipal: string; descripcion: string };
  };
}

// ─── Bell icon ────────────────────────────────────────────────────────────────

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

// ─── NotificationsDropdown ────────────────────────────────────────────────────

function NotificationsDropdown() {
  const { config } = useBusinessType();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config.modules.inventory) return;

    async function load() {
      try {
        const res = await fetch("/api/inventory/alerts");
        if (!res.ok) return;
        const data = await res.json();
        setAlerts(Array.isArray(data.data) ? data.data : []);
      } catch { /* silencioso */ }
    }

    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [config.modules.inventory]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!config.modules.inventory) return null;

  const count = alerts.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-high)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        aria-label="Notificaciones"
      >
        <BellIcon className="w-5 h-5" />
        {count > 0 && (
          <span
            className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
            style={{ background: "var(--error-strong)", color: "#fff" }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-80 rounded-xl overflow-hidden z-50"
          style={{ background: "var(--surface-low)", border: "1px solid var(--surface-highest)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
        >
          {/* Header del dropdown */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--surface-highest)" }}>
            <p className="text-[10px] font-black tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
              Alertas de Stock
            </p>
          </div>

          {count === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>Todo en orden</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Sin productos bajo el mínimo</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {alerts.map((a) => {
                const actual = Number(a.cantidad);
                const minimo = Number(a.stockMinimo);
                const deficit = (minimo - actual).toFixed(2);
                return (
                  <div
                    key={a.id}
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid var(--surface-highest)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: "var(--text-base)" }}>
                          {a.inventoryProduct.product.descripcion}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {a.branch.nombre} · Cód. {a.inventoryProduct.product.codigoPrincipal}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-black tabular-nums" style={{ color: "var(--error-strong)" }}>
                          {actual.toFixed(2)}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          mín. {minimo.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div
                      className="mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded w-fit"
                      style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
                    >
                      Pedir +{deficit}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-4 py-2.5" style={{ borderTop: "1px solid var(--surface-highest)" }}>
            <a
              href="/inventory"
              onClick={() => setOpen(false)}
              className="text-[10px] font-bold tracking-widest uppercase"
              style={{ color: "var(--primary)" }}
            >
              Ver inventario completo →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UserDropdown ─────────────────────────────────────────────────────────────

function UserDropdown() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-high)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
          style={{ background: "var(--primary)", color: "var(--on-primary)" }}
        >
          {initials}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-[11px] font-bold leading-none" style={{ color: "var(--text-base)" }}>
            {user.name.split(" ")[0]}
          </p>
          <p className="text-[9px] leading-none mt-0.5" style={{ color: "var(--text-muted)" }}>
            {isAdmin ? "Admin" : "Empleado"}
          </p>
        </div>
        <svg className="w-3 h-3 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: "var(--text-muted)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-64 rounded-xl overflow-hidden z-50"
          style={{ background: "var(--surface-low)", border: "1px solid var(--surface-highest)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
        >
          {/* Info del usuario */}
          <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--surface-highest)" }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: "var(--text-base)" }}>{user.name}</p>
                <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
                    style={
                      isAdmin
                        ? { background: "var(--primary)", color: "var(--on-primary)" }
                        : { background: "var(--surface-mid)", color: "var(--text-muted)" }
                    }
                  >
                    {isAdmin ? "Admin" : "Empleado"}
                  </span>
                  {user.branch && (
                    <span className="text-[9px] truncate" style={{ color: "var(--text-muted)" }}>
                      {user.branch.nombre}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--surface-high)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-base)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export default function TopBar() {
  return (
    <header
      className="h-14 flex items-center justify-end px-4 gap-2 flex-shrink-0"
      style={{
        background: "var(--surface-low)",
        borderBottom: "1px solid var(--surface-highest)",
      }}
    >
      <NotificationsDropdown />
      <UserDropdown />
    </header>
  );
}
