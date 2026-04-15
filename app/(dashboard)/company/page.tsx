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
  });

  // Certificate upload
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [uploadingCert, setUploadingCert] = useState(false);

  async function load() {
    const res = await fetch("/api/company");
    const data = await res.json();
    if (data.success) {
      const c = data.data;
      setCompany(c);
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
      });
    }
    setLoading(false);
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

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>;

  const activeCert = company?.certificates?.find((c) => c.active);

  return (
    <div>
      <Header
        title="Configuración de Empresa"
        subtitle="Datos del emisor electrónico"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Datos del Contribuyente</h2>

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
                placeholder="Número resolución (si aplica)"
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

            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Establecimiento y Punto de Emisión</h3>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Estab."
                  value={form.estab}
                  onChange={(e) => setForm({ ...form, estab: e.target.value })}
                  maxLength={3}
                  placeholder="001"
                />
                <Input
                  label="Pto. Emisión"
                  value={form.ptoEmi}
                  onChange={(e) => setForm({ ...form, ptoEmi: e.target.value })}
                  maxLength={3}
                  placeholder="001"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Configuración SRI</h3>
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
                <div className="flex items-center gap-3">
                  <input
                    id="obligado"
                    type="checkbox"
                    checked={form.obligadoContab}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setForm({ ...form, obligadoContab: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="obligado" className="text-sm text-gray-700">
                    Obligado a llevar contabilidad
                  </label>
                </div>
              </div>
            </div>

            {form.ambiente === "PRODUCCION" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-700 font-medium">
                  ⚠️ Ambiente de PRODUCCIÓN activo — las facturas serán enviadas al SRI real
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>
                Guardar Cambios
              </Button>
            </div>
          </form>
        </div>

        {/* Certificate */}
        <div className="space-y-4">
          {/* Current cert */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Certificado Digital</h3>
            {activeCert ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔐</span>
                  <div>
                    <p className="font-medium text-sm">{activeCert.fileName}</p>
                    <Badge variant="success">Activo</Badge>
                  </div>
                </div>
                {activeCert.validFrom && (
                  <div className="text-xs text-gray-500">
                    <div>Válido desde: {new Date(activeCert.validFrom).toLocaleDateString("es-EC")}</div>
                    <div>Válido hasta: {activeCert.validTo ? new Date(activeCert.validTo).toLocaleDateString("es-EC") : "—"}</div>
                  </div>
                )}
                {activeCert.thumbprint && (
                  <div className="text-xs text-gray-400 font-mono break-all">
                    SHA-1: {activeCert.thumbprint}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-4xl mb-2">🔑</p>
                <p className="text-sm text-gray-400">Sin certificado activo</p>
              </div>
            )}
          </div>

          {/* Upload cert */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Cargar Certificado</h3>
            <form onSubmit={handleCertUpload} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Archivo .p12 / .pfx
                </label>
                <input
                  type="file"
                  accept=".p12,.pfx"
                  onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3
                    file:rounded-lg file:border-0 file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
