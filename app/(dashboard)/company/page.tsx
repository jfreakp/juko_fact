"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface Certificate {
  id: string;
  fileName: string;
  thumbprint: string | null;
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
}

interface CompanyData {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  dirMatriz: string;
  estab: string;
  ptoEmi: string;
  contribuyenteEsp: string | null;
  obligadoContab: boolean;
  ambiente: string;
  tipoEmision: string;
  logoUrl: string | null;
  secuencialInicio: number;
  certificates: Certificate[];
}

const AMBIENTE_OPTIONS = [
  { value: "PRUEBAS", label: "Pruebas (Certificación)" },
  { value: "PRODUCCION", label: "Producción" },
];

const TIPO_EMISION_OPTIONS = [
  { value: "NORMAL", label: "Normal" },
  { value: "INDISPONIBILIDAD", label: "Indisponibilidad del sistema" },
];

export default function CompanyPage() {
  const { success, error: toastError } = useToast();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ruc: "",
    razonSocial: "",
    nombreComercial: "",
    dirMatriz: "",
    estab: "001",
    ptoEmi: "001",
    contribuyenteEsp: "",
    obligadoContab: false,
    ambiente: "PRUEBAS",
    tipoEmision: "NORMAL",
    secuencialInicio: 1,
  });

  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [uploadingCert, setUploadingCert] = useState(false);

  // Logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function load() {
    const res = await fetch("/api/company");
    const data = await res.json();
    if (data.success) {
      const c = data.data;
      setCompany(c);
      setLogoPreview(c.logoUrl ?? null);
      setForm({
        ruc: c.ruc ?? "",
        razonSocial: c.razonSocial ?? "",
        nombreComercial: c.nombreComercial ?? "",
        dirMatriz: c.dirMatriz ?? "",
        estab: c.estab ?? "001",
        ptoEmi: c.ptoEmi ?? "001",
        contribuyenteEsp: c.contribuyenteEsp ?? "",
        obligadoContab: c.obligadoContab ?? false,
        ambiente: c.ambiente ?? "PRUEBAS",
        tipoEmision: c.tipoEmision ?? "NORMAL",
        secuencialInicio: c.secuencialInicio ?? 1,
      });
    }
    setLoading(false);
  }

  async function handleLogoUpload(file: File) {
    if (!file) return;
    setUploadingLogo(true);
    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/company/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setLogoPreview(data.data.logoUrl);
      success("Logo actualizado");
    } catch (err) {
      setLogoPreview(company?.logoUrl ?? null);
      toastError(err instanceof Error ? err.message : "Error al subir logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoDelete() {
    setUploadingLogo(true);
    try {
      const res = await fetch("/api/company/logo", { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setLogoPreview(null);
      success("Logo eliminado");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al eliminar logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      success("Datos de empresa actualizados");
      load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleCertUpload(e: FormEvent) {
    e.preventDefault();
    if (!certFile || !certPassword) {
      toastError("Seleccione el certificado y la contraseña");
      return;
    }
    setUploadingCert(true);
    try {
      const formData = new FormData();
      formData.append("certificate", certFile);
      formData.append("password", certPassword);
      const res = await fetch("/api/company/certificate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      success("Certificado cargado exitosamente");
      setCertFile(null);
      setCertPassword("");
      load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al cargar certificado");
    } finally {
      setUploadingCert(false);
    }
  }

  if (loading) {
    return (
      <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const activeCert = company?.certificates?.find((c) => c.active);

  return (
    <div style={{ background: "var(--surface)" }} className="min-h-screen p-8">
      <Header
        title="Empresa"
        subtitle="Configuración del emisor electrónico SRI"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSave}
            className="rounded-xl p-6 space-y-5"
            style={{ background: "var(--surface-white)" }}
          >
            <p
              className="text-[10px] font-bold tracking-[0.15em] uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              Identidad Tributaria
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="RUC"
                  value={form.ruc}
                  onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                  placeholder="0999999999001"
                  maxLength={13}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Razón Social"
                  value={form.razonSocial}
                  onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
                  placeholder="Nombre legal de la empresa"
                  required
                />
              </div>
              <Input
                label="Nombre Comercial"
                value={form.nombreComercial}
                onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })}
                placeholder="Nombre comercial (opcional)"
              />
              <Input
                label="Contribuyente Especial"
                value={form.contribuyenteEsp}
                onChange={(e) => setForm({ ...form, contribuyenteEsp: e.target.value })}
                placeholder="N° resolución (si aplica)"
              />
              <div className="col-span-2">
                <Input
                  label="Dirección Matriz"
                  value={form.dirMatriz}
                  onChange={(e) => setForm({ ...form, dirMatriz: e.target.value })}
                  placeholder="Dirección de la matriz"
                  required
                />
              </div>
            </div>

            <div
              className="pt-4"
              style={{ borderTop: "1px solid var(--surface-highest)" }}
            >
              <p
                className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                Establecimiento y Punto de Emisión
              </p>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Establecimiento"
                  value={form.estab}
                  onChange={(e) => setForm({ ...form, estab: e.target.value })}
                  maxLength={3}
                  placeholder="001"
                />
                <Input
                  label="Punto de Emisión"
                  value={form.ptoEmi}
                  onChange={(e) => setForm({ ...form, ptoEmi: e.target.value })}
                  maxLength={3}
                  placeholder="001"
                />
                <Input
                  label="Secuencial Inicial"
                  type="number"
                  value={String(form.secuencialInicio)}
                  onChange={(e) =>
                    setForm({ ...form, secuencialInicio: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  placeholder="1"
                />
              </div>
              <p
                className="text-[10px] -mt-2"
                style={{ color: "var(--text-muted)" }}
              >
                Número desde el que inicia la serie de comprobantes. Solo aplica antes de emitir la primera factura.
              </p>
            </div>

            <div
              className="pt-4"
              style={{ borderTop: "1px solid var(--surface-highest)" }}
            >
              <p
                className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                Configuración SRI
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Ambiente"
                  options={AMBIENTE_OPTIONS}
                  value={form.ambiente}
                  onChange={(e) => setForm({ ...form, ambiente: e.target.value })}
                />
                <Select
                  label="Tipo de Emisión"
                  options={TIPO_EMISION_OPTIONS}
                  value={form.tipoEmision}
                  onChange={(e) => setForm({ ...form, tipoEmision: e.target.value })}
                />
                <div className="flex items-center gap-3 col-span-2">
                  <input
                    id="obligado"
                    type="checkbox"
                    checked={form.obligadoContab}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setForm({ ...form, obligadoContab: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "var(--primary-focus)" }}
                  />
                  <label
                    htmlFor="obligado"
                    className="text-sm font-medium"
                    style={{ color: "var(--text-base)" }}
                  >
                    Obligado a llevar contabilidad
                  </label>
                </div>
              </div>
            </div>

            {form.ambiente === "PRODUCCION" && (
              <div
                className="px-4 py-3 rounded-xl"
                style={{
                  background: "var(--warning-bg)",
                  border: "1px solid var(--primary-focus)",
                }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--warning-text)" }}>
                  Ambiente PRODUCCIÓN activo — las facturas serán enviadas al SRI real
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>
                Guardar Configuración
              </Button>
            </div>
          </form>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* ── Logo ── */}
          <div className="rounded-xl p-6" style={{ background: "var(--surface-white)" }}>
            <p
              className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Logo de la Empresa
            </p>

            {logoPreview ? (
              /* Preview state */
              <div className="space-y-3">
                <div
                  className="relative rounded-xl overflow-hidden flex items-center justify-center"
                  style={{
                    background: "var(--surface-low)",
                    border: "2px dashed var(--border-subtle)",
                    height: "120px",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="Logo empresa"
                    className="max-h-full max-w-full object-contain p-3"
                    style={{ opacity: uploadingLogo ? 0.5 : 1 }}
                  />
                  {uploadingLogo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24"
                        style={{ color: "var(--primary-focus)" }}>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <label
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold tracking-widest uppercase cursor-pointer transition-colors"
                    style={{
                      background: "var(--info-bg)",
                      color: "var(--info-text)",
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Cambiar
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    disabled={uploadingLogo}
                    className="px-3 py-2 rounded-lg text-[11px] font-bold tracking-widest uppercase transition-colors disabled:opacity-40"
                    style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              /* Upload drop zone */
              <label
                className="flex flex-col items-center justify-center gap-3 rounded-xl cursor-pointer transition-colors group"
                style={{
                  background: "var(--surface-low)",
                  border: "2px dashed var(--border-subtle)",
                  height: "140px",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "var(--primary-focus)";
                  e.currentTarget.style.background = "var(--warning-bg)";
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.background = "var(--surface-low)";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.background = "var(--surface-low)";
                  const f = e.dataTransfer.files[0];
                  if (f) handleLogoUpload(f);
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--surface-highest)" }}
                >
                  {uploadingLogo ? (
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"
                      style={{ color: "var(--primary-focus)" }}>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                      style={{ color: "var(--text-muted)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold" style={{ color: "var(--text-base)" }}>
                    Subir logo
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    PNG, JPG, SVG · Máx 2 MB
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    o arrastre aquí
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {/* ── Certificate ── */}
          {/* Current cert */}
          <div className="rounded-xl p-6" style={{ background: "var(--surface-white)" }}>
            <p
              className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Certificado Digital
            </p>
            {activeCert ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--surface-low)" }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                      style={{ color: "var(--primary-focus)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-base)" }}>
                      {activeCert.fileName}
                    </p>
                    <Badge variant="success">Activo</Badge>
                  </div>
                </div>
                {activeCert.validFrom && (
                  <div
                    className="text-[11px] space-y-1 pt-2"
                    style={{
                      color: "var(--text-muted)",
                      borderTop: "1px solid var(--surface-highest)",
                    }}
                  >
                    <div>Desde: {new Date(activeCert.validFrom).toLocaleDateString("es-EC")}</div>
                    <div>Hasta: {activeCert.validTo ? new Date(activeCert.validTo).toLocaleDateString("es-EC") : "—"}</div>
                  </div>
                )}
                {activeCert.thumbprint && (
                  <p
                    className="text-[10px] font-mono break-all"
                    style={{ color: "var(--border-strong)" }}
                  >
                    {activeCert.thumbprint.slice(0, 20)}…
                  </p>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div
                  className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "var(--surface-low)" }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                    style={{ color: "var(--text-muted)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <p className="text-sm font-bold" style={{ color: "var(--text-base)" }}>Sin certificado</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Cargue su firma .p12</p>
              </div>
            )}
          </div>

          {/* Upload cert */}
          <div className="rounded-xl p-6" style={{ background: "var(--surface-white)" }}>
            <p
              className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Cargar Certificado
            </p>
            <form onSubmit={handleCertUpload} className="space-y-4">
              <div>
                <label
                  className="text-[11px] font-bold tracking-widest uppercase block mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Archivo .p12 / .pfx
                </label>
                <input
                  type="file"
                  accept=".p12,.pfx"
                  onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm file:mr-3 file:py-2 file:px-3
                    file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:tracking-widest file:uppercase
                    file:cursor-pointer"
                  style={{
                    color: "var(--text-muted)",
                  }}
                />
              </div>
              <Input
                label="Contraseña del certificado"
                type="password"
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Button
                type="submit"
                className="w-full"
                variant="secondary"
                loading={uploadingCert}
              >
                Cargar Certificado
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
