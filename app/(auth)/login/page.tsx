"use client";

import { useState, FormEvent } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@techsoluciones.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Error de autenticación");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "var(--primary)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--on-primary)" }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-base font-black tracking-tight" style={{ color: "var(--on-primary)" }}>
            JUKO_FACT
          </span>
        </div>

        {/* Headline */}
        <div>
          <h1
            className="text-5xl font-black leading-[1.05] tracking-tight mb-6"
            style={{ color: "var(--on-primary)" }}
          >
            El Futuro de la Facturación Empresarial.
          </h1>
          <p className="text-base font-medium leading-relaxed" style={{ color: "var(--on-primary)", opacity: 0.7 }}>
            Sistema de gestión financiera diseñado para claridad absoluta y precisión sin latencia.
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-10">
          <div>
            <p className="text-3xl font-black" style={{ color: "var(--on-primary)" }}>99.9%</p>
            <p className="text-xs font-bold tracking-widest uppercase mt-1" style={{ color: "var(--on-primary)", opacity: 0.6 }}>
              Disponibilidad
            </p>
          </div>
          <div>
            <p className="text-3xl font-black" style={{ color: "var(--on-primary)" }}>SRI</p>
            <p className="text-xs font-bold tracking-widest uppercase mt-1" style={{ color: "var(--on-primary)", opacity: 0.6 }}>
              Ecuador
            </p>
          </div>
        </div>
      </div>

      {/* Right — Form panel */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-8"
        style={{ background: "var(--surface-white)" }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--primary)" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary)" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-black tracking-tight" style={{ color: "var(--text-base)" }}>JUKO_FACT</span>
          </div>

          <h2 className="text-3xl font-black tracking-tight mb-1" style={{ color: "var(--text-base)" }}>
            Bienvenido
          </h2>
          <p className="text-sm font-medium mb-8" style={{ color: "var(--text-muted)" }}>
            Acceda a su libro mayor empresarial
          </p>

          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm font-medium mb-6 flex items-center gap-2"
              style={{
                background: "var(--error-bg)",
                color: "var(--error-text)",
                border: "1px solid var(--error-strong)",
              }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Correo de trabajo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              required
            />

            <Input
              label="Clave de seguridad"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Establecer Sesión →
            </Button>
          </form>

          <p className="text-center text-[10px] font-medium mt-8 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Solo personal autorizado. Todos los datos son registrados y monitoreados.
            <br />JUKO_FACT Sistema de Facturación Industrial © 2025
          </p>
        </div>
      </div>
    </div>
  );
}
