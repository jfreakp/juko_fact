"use client";

import { use, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Cuota {
  id: string;
  numeroCuota: number;
  monto: number;
  fechaVencimiento: string;
  estado: "PENDIENTE" | "PAGADO" | "VENCIDO";
}

interface Abono {
  id: string;
  monto: number;
  formaPago: string;
  notas: string | null;
  fecha: string;
}

interface CxCData {
  id: string;
  totalOriginal: number;
  saldoPendiente: number;
  estado: string;
  fechaVencimiento: string;
  notas: string | null;
  client: { razonSocial: string; identificacion: string; email: string | null };
  invoice: {
    id: string;
    secuencial: string;
    fechaEmision: string;
    importeTotal: number;
    estado: string;
    claveAcceso: string | null;
  };
  abonos: Abono[];
  cuotas: Cuota[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const FORMAS_PAGO_ABONO = [
  { value: "01", label: "Efectivo" },
  { value: "16", label: "Tarjeta de débito" },
  { value: "17", label: "Dinero electrónico" },
  { value: "18", label: "Tarjeta prepago" },
  { value: "20", label: "Otros (sistema financiero)" },
];

const FORMA_PAGO_LABEL: Record<string, string> = {
  "01": "Efectivo",
  "16": "Tarjeta débito",
  "17": "Dinero electrónico",
  "18": "Tarjeta prepago",
  "20": "Otros",
};

// ─── Helpers visuales ────────────────────────────────────────────────────────

function fmt(val: number) {
  return `$${Number(val).toFixed(2)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function estadoCxCStyle(estado: string, fechaVencimiento?: string) {
  const vencida = fechaVencimiento && new Date(fechaVencimiento) < new Date();
  const efectivo =
    (estado === "PENDIENTE" || estado === "PARCIAL") && vencida ? "VENCIDO" : estado;

  const map: Record<string, { bg: string; text: string; label: string }> = {
    PENDIENTE: { bg: "var(--warning-bg)",      text: "var(--warning-text)",  label: "Pendiente" },
    PARCIAL:   { bg: "var(--warning-bg)",      text: "var(--warning-text)",  label: "Parcial"   },
    VENCIDO:   { bg: "var(--error-bg)",        text: "var(--error-text)",    label: "Vencido"   },
    PAGADO:    { bg: "var(--success-bg)",      text: "var(--success-text)",  label: "Pagado"    },
    CANCELADA: { bg: "var(--surface-highest)", text: "var(--text-muted)",    label: "Cancelada" },
  };
  return map[efectivo] ?? map["PENDIENTE"];
}

function estadoCuotaStyle(estado: string, fechaVencimiento: string) {
  const vencida = new Date(fechaVencimiento) < new Date();
  const efectivo = estado === "PENDIENTE" && vencida ? "VENCIDO" : estado;

  const map: Record<string, { bg: string; text: string; label: string }> = {
    PENDIENTE: { bg: "var(--warning-bg)",      text: "var(--warning-text)",  label: "Pendiente" },
    VENCIDO:   { bg: "var(--error-bg)",        text: "var(--error-text)",    label: "Vencida"   },
    PAGADO:    { bg: "var(--success-bg)",      text: "var(--success-text)",  label: "Pagada"    },
  };
  return map[efectivo] ?? map["PENDIENTE"];
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CxCDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { success, error: toastError } = useToast();

  const [cxc, setCxc]             = useState<CxCData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);

  const [formMonto, setFormMonto]         = useState("");
  const [formFormaPago, setFormFormaPago] = useState("01");
  const [formNotas, setFormNotas]         = useState("");

  async function load() {
    setLoading(true);
    const res  = await fetch(`/api/cxc/${id}`);
    const json = await res.json();
    if (json.success) setCxc(json.data);
    else toastError("No se pudo cargar la cuenta");
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  function openModal(montoPreset?: number) {
    setFormMonto(montoPreset ? montoPreset.toFixed(2) : "");
    setFormFormaPago("01");
    setFormNotas("");
    setModalOpen(true);
  }

  async function handleAbono(e: FormEvent) {
    e.preventDefault();
    const monto = parseFloat(formMonto);
    if (!monto || monto <= 0) { toastError("El monto debe ser mayor a 0"); return; }
    if (cxc && monto > Number(cxc.saldoPendiente) + 0.001) {
      toastError(`Excede el saldo pendiente (${fmt(Number(cxc.saldoPendiente))})`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/cxc/${id}/abonos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto, formaPago: formFormaPago, notas: formNotas || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      success("Abono registrado correctamente");
      setModalOpen(false);
      load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al registrar abono");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center" style={{ background: "var(--surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando...</p>
      </div>
    );
  }

  if (!cxc) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center" style={{ background: "var(--surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cuenta no encontrada</p>
      </div>
    );
  }

  const total       = Number(cxc.totalOriginal);
  const saldo       = Number(cxc.saldoPendiente);
  const cobrado     = total - saldo;
  const pct         = total > 0 ? Math.min(100, (cobrado / total) * 100) : 0;
  const estadoCfg   = estadoCxCStyle(cxc.estado, cxc.fechaVencimiento);
  const puedoAbonar = cxc.estado !== "PAGADO" && cxc.estado !== "CANCELADA";
  const tieneCuotas = cxc.cuotas.length > 0;

  // Cuotas pendientes (para el badge de resumen)
  const cuotasPendientes = cxc.cuotas.filter(
    (c) => c.estado !== "PAGADO"
  ).length;

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--surface)" }}>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/cxc"
          className="text-[10px] font-bold tracking-widest uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          ← Cuentas por Cobrar
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black" style={{ color: "var(--text-base)" }}>
              Factura {cxc.invoice.secuencial}
            </h1>
            <span
              className="px-2 py-0.5 rounded text-[9px] font-bold tracking-[0.15em] uppercase"
              style={{ background: estadoCfg.bg, color: estadoCfg.text }}
            >
              {estadoCfg.label}
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {cxc.client.razonSocial} — {cxc.client.identificacion}
          </p>
        </div>
        {puedoAbonar && (
          <Button onClick={() => openModal()}>Registrar Abono</Button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        {[
          { label: "Total Factura",   value: fmt(total)   },
          { label: "Cobrado",         value: fmt(cobrado) },
          { label: "Saldo Pendiente", value: fmt(saldo)   },
          { label: "Vence",           value: fmtDate(cxc.fechaVencimiento) },
        ].map((c) => (
          <div
            key={c.label}
            className="p-4 rounded-xl"
            style={{ background: "var(--surface-white)", border: "1px solid var(--surface-highest)" }}
          >
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>
              {c.label}
            </p>
            <p className="text-xl font-black" style={{ color: "var(--text-base)" }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Barra de progreso */}
      <div
        className="p-5 rounded-xl mb-6"
        style={{ background: "var(--surface-white)", border: "1px solid var(--surface-highest)" }}
      >
        <div className="flex justify-between mb-2">
          <span className="text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
            Progreso de cobro
          </span>
          <span className="text-xs font-bold" style={{ color: "var(--text-base)" }}>
            {pct.toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-highest)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? "var(--success-text)" : "var(--primary-focus)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Cobrado: {fmt(cobrado)}</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Pendiente: {fmt(saldo)}</span>
        </div>
      </div>

      {/* ── Plan de Pago (Cuotas) ────────────────────────────────────────────── */}
      {tieneCuotas && (
        <div
          className="rounded-xl overflow-hidden mb-6"
          style={{ border: "1px solid var(--surface-highest)" }}
        >
          {/* Header */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ background: "var(--surface-mid)", borderBottom: "1px solid var(--surface-highest)" }}
          >
            <div>
              <p className="text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
                Plan de Pago — {cxc.cuotas.length} cuotas mensuales
              </p>
            </div>
            {cuotasPendientes > 0 && (
              <span
                className="px-2 py-0.5 rounded text-[9px] font-bold tracking-[0.12em] uppercase"
                style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
              >
                {cuotasPendientes} pendiente{cuotasPendientes !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-mid)" }}>
                {["Cuota", "Vencimiento", "Monto", "Estado", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[9px] font-bold tracking-[0.15em] uppercase"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cxc.cuotas.map((cuota, i) => {
                const cfg        = estadoCuotaStyle(cuota.estado, cuota.fechaVencimiento);
                const esPagada   = cuota.estado === "PAGADO";
                const puedeAbonar = puedoAbonar && !esPagada;

                return (
                  <tr
                    key={cuota.id}
                    style={{
                      background: i % 2 === 0 ? "var(--surface-white)" : "var(--surface)",
                      opacity: esPagada ? 0.7 : 1,
                    }}
                  >
                    {/* N° cuota */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0"
                          style={{
                            background: esPagada ? "var(--success-bg)" : "var(--surface-highest)",
                            color: esPagada ? "var(--success-text)" : "var(--text-muted)",
                          }}
                        >
                          {esPagada ? "✓" : cuota.numeroCuota}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                          Cuota {cuota.numeroCuota}
                        </span>
                      </div>
                    </td>

                    {/* Fecha vencimiento */}
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {fmtDate(cuota.fechaVencimiento)}
                    </td>

                    {/* Monto */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-black" style={{ color: "var(--text-base)" }}>
                        {fmt(cuota.monto)}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-[0.12em] uppercase"
                        style={{ background: cfg.bg, color: cfg.text }}
                      >
                        {cfg.label}
                      </span>
                    </td>

                    {/* Acción */}
                    <td className="px-4 py-3">
                      {puedeAbonar && (
                        <button
                          type="button"
                          onClick={() => openModal(Number(cuota.monto))}
                          className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md transition-colors"
                          style={{
                            background: "var(--primary)",
                            color: "var(--on-primary)",
                          }}
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.opacity = "0.85")
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.opacity = "1")
                          }
                        >
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total row */}
            <tfoot>
              <tr style={{ background: "var(--surface-mid)", borderTop: "2px solid var(--surface-highest)" }}>
                <td className="px-4 py-3 text-[9px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }} colSpan={2}>
                  Total plan
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-black" style={{ color: "var(--primary-focus)" }}>
                    {fmt(cxc.cuotas.reduce((s, c) => s + Number(c.monto), 0))}
                  </span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Historial de Abonos ──────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--surface-highest)" }}
      >
        <div
          className="px-5 py-3"
          style={{ background: "var(--surface-mid)", borderBottom: "1px solid var(--surface-highest)" }}
        >
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
            Historial de Abonos ({cxc.abonos.length})
          </p>
        </div>

        {cxc.abonos.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ background: "var(--surface-white)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Sin abonos registrados aún
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-mid)" }}>
                {["Fecha", "Forma de Pago", "Monto", "Notas"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[9px] font-bold tracking-[0.15em] uppercase"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cxc.abonos.map((abono, i) => (
                <tr
                  key={abono.id}
                  style={{ background: i % 2 === 0 ? "var(--surface-white)" : "var(--surface)" }}
                >
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {fmtDate(abono.fecha)}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-base)" }}>
                    {FORMA_PAGO_LABEL[abono.formaPago] ?? abono.formaPago}
                  </td>
                  <td className="px-4 py-3 text-xs font-black" style={{ color: "var(--text-base)" }}>
                    {fmt(abono.monto)}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {abono.notas ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal Registrar Abono ─────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar Abono"
      >
        <form onSubmit={handleAbono} className="space-y-4">
          <div>
            <label
              className="block text-[9px] font-bold tracking-[0.15em] uppercase mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Monto a abonar
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={saldo}
              value={formMonto}
              onChange={(e) => setFormMonto(e.target.value)}
              placeholder={`Máx: ${fmt(saldo)}`}
              required
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--surface-white)",
                border: "2px solid var(--border-subtle)",
                color: "var(--text-base)",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />
            {saldo > 0 && (
              <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                Saldo pendiente: <strong>{fmt(saldo)}</strong>
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-[9px] font-bold tracking-[0.15em] uppercase mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Forma de pago
            </label>
            <select
              value={formFormaPago}
              onChange={(e) => setFormFormaPago(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--surface-white)",
                border: "2px solid var(--border-subtle)",
                color: "var(--text-base)",
              }}
            >
              {FORMAS_PAGO_ABONO.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-[9px] font-bold tracking-[0.15em] uppercase mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Notas (opcional)
            </label>
            <textarea
              value={formNotas}
              onChange={(e) => setFormNotas(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                background: "var(--surface-white)",
                border: "2px solid var(--border-subtle)",
                color: "var(--text-base)",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-focus)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase"
              style={{ background: "var(--surface-highest)", color: "var(--text-muted)" }}
            >
              Cancelar
            </button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
