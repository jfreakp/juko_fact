"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-manrope, 'Manrope', sans-serif)", background: "#ffffff", color: "#1c1b1b" }} className="antialiased">

      {/* ── Header ── */}
      <header style={{ borderBottom: "1px solid #f3f4f6", background: "#ffffff" }} className="sticky top-0 w-full z-50">
        <div className="flex justify-between items-center px-8 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--primary)" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary)" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight" style={{ color: "#111827" }}>JUKO_FACT</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold transition-colors" style={{ color: "#111827", borderBottom: "2px solid var(--primary)", paddingBottom: "2px" }}>
              Funciones
            </a>
            <a href="#stats" className="text-sm font-medium transition-colors" style={{ color: "#6b7280" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#111827")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#6b7280")}
            >
              Estadísticas
            </a>
            <a href="#sri" className="text-sm font-medium transition-colors" style={{ color: "#6b7280" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#111827")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#6b7280")}
            >
              SRI
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-bold transition-colors"
              style={{ color: "#374151" }}
            >
              Ingresar
            </Link>
            <Link
              href="/login"
              className="px-5 py-2 rounded-lg text-sm font-black transition-all active:scale-95"
              style={{ background: "var(--primary)", color: "var(--on-primary)" }}
            >
              Comenzar
            </Link>
          </div>
        </div>
      </header>

      <main>

        {/* ── Hero ── */}
        <section style={{ background: "#ffffff" }} className="py-24 px-8">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">

            {/* Left */}
            <div className="lg:w-1/2 space-y-8">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
                style={{ background: "#f9fafb", border: "1px solid #f3f4f6", color: "#6b7280" }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--primary)" }} />
                Autorizado por el SRI
              </div>

              <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter leading-[1.1]" style={{ color: "#111827" }}>
                Facturación Electrónica en Ecuador:{" "}
                <span className="px-2" style={{ color: "var(--primary)", background: "#111827" }}>Simple</span>
              </h1>

              <p className="text-xl leading-relaxed max-w-xl" style={{ color: "#4b5563" }}>
                JUKO_FACT integra su negocio directamente con el SRI. Olvide la complejidad técnica y concéntrese en crecer. Emisión inmediata, seguridad y soporte experto.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-extrabold transition-all active:scale-95"
                  style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                >
                  Ingresar al Sistema
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <a
                  href="#features"
                  className="px-8 py-4 rounded-xl text-lg font-bold transition-all active:scale-95"
                  style={{ background: "#ffffff", color: "#111827", border: "1px solid #e5e7eb" }}
                >
                  Ver Funciones
                </a>
              </div>
            </div>

            {/* Right — mock dashboard preview */}
            <div className="lg:w-1/2 relative">
              <div
                className="rounded-2xl w-full overflow-hidden"
                style={{ background: "#f9fafb", border: "1px solid #f3f4f6", padding: "24px" }}
              >
                {/* Mock browser bar */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full" style={{ background: "#fca5a5" }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: "#fcd34d" }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: "#6ee7b7" }} />
                  <div className="flex-1 ml-2 h-6 rounded" style={{ background: "#e5e7eb" }} />
                </div>

                {/* Mock dashboard UI */}
                <div className="rounded-xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 p-4">
                    {[
                      { label: "Total Facturas", value: "1,284", color: "var(--primary)" },
                      { label: "Autorizadas", value: "1,241", color: "#6ee7b7" },
                      { label: "Pendientes", value: "43", color: "#fcd34d" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg p-3" style={{ background: "#f9fafb" }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#9ca3af" }}>{s.label}</p>
                        <p className="text-xl font-black" style={{ color: "#111827" }}>{s.value}</p>
                        <div className="mt-1.5 h-1 rounded-full" style={{ background: s.color, width: "60%" }} />
                      </div>
                    ))}
                  </div>

                  {/* Mock table */}
                  <div style={{ borderTop: "1px solid #f3f4f6" }}>
                    <div className="px-4 py-2.5 flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6b7280" }}>Facturas Recientes</p>
                      <div className="h-4 w-14 rounded" style={{ background: "#f3f4f6" }} />
                    </div>
                    {[
                      { num: "001-001-000001", client: "Empresa ABC S.A.", amount: "$1,240.00", status: "AUTORIZADA" },
                      { num: "001-001-000002", client: "Juan Pérez", amount: "$85.50", status: "AUTORIZADA" },
                      { num: "001-001-000003", client: "Tech Corp Cía.", amount: "$3,450.00", status: "PENDIENTE" },
                    ].map((row, i) => (
                      <div
                        key={row.num}
                        className="px-4 py-2.5 flex items-center justify-between text-[11px]"
                        style={{ background: i % 2 === 0 ? "#ffffff" : "#fafafa", borderTop: "1px solid #f9fafb" }}
                      >
                        <span className="font-mono font-semibold" style={{ color: "#374151" }}>{row.num}</span>
                        <span className="hidden sm:block font-medium" style={{ color: "#6b7280" }}>{row.client}</span>
                        <span className="font-bold" style={{ color: "#111827" }}>{row.amount}</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                          style={
                            row.status === "AUTORIZADA"
                              ? { background: "#dcfce7", color: "#166534" }
                              : { background: "#fef9c3", color: "#854d0e" }
                          }
                        >
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div
                className="absolute -bottom-5 -left-4 p-4 rounded-xl hidden md:block"
                style={{ background: "#ffffff", border: "1px solid #f3f4f6", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
              >
                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: "#9ca3af" }}>Total Facturado Hoy</p>
                <p className="text-2xl font-black" style={{ color: "#111827" }}>$12,450.00</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: "#16a34a" }}>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-[10px] font-bold" style={{ color: "#16a34a" }}>100% Sincronizado SRI</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust Badges ── */}
        <section id="sri" style={{ background: "#ffffff", borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6" }} className="py-12">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-wrap justify-between items-center gap-8" style={{ opacity: 0.4, filter: "grayscale(1)" }}>
              {[
                { icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3", label: "BANCO CENTRAL" },
                { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "SRI ECUADOR" },
                { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "ISO 27001" },
                { icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z", label: "AWS CLOUD" },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-3 font-bold text-base">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={b.icon} />
                  </svg>
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features Bento ── */}
        <section id="features" style={{ background: "#ffffff" }} className="py-24 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl font-black tracking-tight" style={{ color: "#111827" }}>
                Potencia Industrial para su Negocio
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "#6b7280" }}>
                Diseñado para la precisión contable y la velocidad operativa del mercado ecuatoriano.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Large card */}
              <div
                className="md:col-span-2 p-10 rounded-2xl flex flex-col justify-between group"
                style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}
              >
                <div>
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center mb-8"
                    style={{ background: "var(--primary)" }}
                  >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="var(--on-primary)" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold mb-4" style={{ color: "#111827" }}>Conexión Directa SRI</h3>
                  <p className="text-lg leading-relaxed max-w-md" style={{ color: "#4b5563" }}>
                    Sincronización en tiempo real con los servidores del SRI, evitando colas de espera y errores de validación comunes en otros sistemas.
                  </p>
                </div>
                <div className="mt-12 pt-8 flex justify-between items-center" style={{ borderTop: "1px solid #e5e7eb" }}>
                  <span className="font-bold" style={{ color: "#111827" }}>Explorar Integración</span>
                  <svg
                    className="w-5 h-5 transition-transform group-hover:translate-x-2"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    style={{ color: "var(--primary-focus)" }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>

              {/* Small card 1 */}
              <div
                className="p-10 rounded-2xl flex flex-col"
                style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#111827" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "#111827" }}>Seguridad Total</h3>
                <p style={{ color: "#6b7280" }}>
                  Encriptación de grado industrial para sus firmas electrónicas y comprobantes. Sus datos están blindados.
                </p>
              </div>

              {/* Small card 2 */}
              <div
                className="p-10 rounded-2xl flex flex-col"
                style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#111827" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "#111827" }}>Gestión de Clientes</h3>
                <p style={{ color: "#6b7280" }}>
                  Base de datos que autocompleta información de RUC y mantiene historial completo de consumos.
                </p>
              </div>

              {/* Large dark card */}
              <div
                className="md:col-span-2 p-10 rounded-2xl flex flex-col md:flex-row gap-10 items-center overflow-hidden"
                style={{ background: "#111827" }}
              >
                <div className="flex-1 space-y-6">
                  <h3 className="text-3xl font-bold" style={{ color: "#ffffff" }}>
                    Analítica de Ventas en Tiempo Real
                  </h3>
                  <p style={{ color: "#9ca3af", lineHeight: "1.7" }}>
                    No solo facture. Entienda su negocio con reportes automáticos de ventas, retenciones e IVA acumulado.
                  </p>
                  <Link
                    href="/login"
                    className="inline-block px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
                    style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                  >
                    Acceder al Dashboard
                  </Link>
                </div>
                {/* Mini chart mockup */}
                <div className="flex-1 w-full">
                  <div className="rounded-lg p-4" style={{ background: "#1f2937" }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-4" style={{ color: "#6b7280" }}>Ventas Mensuales</p>
                    <div className="flex items-end gap-2 h-24">
                      {[40, 65, 45, 80, 55, 90, 70, 95, 60, 100, 75, 85].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm transition-all"
                          style={{
                            height: `${h}%`,
                            background: i === 9 ? "var(--primary)" : "#374151",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2">
                      {["E","F","M","A","M","J","J","A","S","O","N","D"].map((m) => (
                        <span key={m} className="text-[8px]" style={{ color: "#4b5563" }}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA / Stats ── */}
        <section id="stats" style={{ background: "#ffffff", borderTop: "1px solid #f3f4f6" }} className="py-24">
          <div className="max-w-7xl mx-auto px-8 text-center space-y-12">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#9ca3af" }}>
              Próxima Generación
            </p>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight" style={{ color: "#111827" }}>
              ¿Listo para modernizar<br />su facturación?
            </h2>

            <div className="flex flex-col md:flex-row justify-center items-center gap-8">
              {[
                { value: "0%", label: "Errores de Emisión" },
                { value: "24/7", label: "Soporte Técnico Local" },
                { value: "30s", label: "Tiempo de Facturación" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-8 rounded-2xl w-full md:w-72"
                  style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}
                >
                  <p className="text-4xl font-black mb-2" style={{ color: "#111827" }}>{s.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9ca3af" }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link
                href="/login"
                className="inline-block px-12 py-5 rounded-2xl text-xl font-black transition-all hover:scale-105 active:scale-95"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
              >
                Ingresar al Sistema →
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer style={{ background: "#ffffff", borderTop: "1px solid #f3f4f6" }} className="pt-20 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 w-full gap-8 max-w-7xl mx-auto text-sm">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--primary)" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary)" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-black tracking-tight uppercase text-lg" style={{ color: "#111827" }}>JUKO_FACT</span>
          </div>

          <div className="flex gap-8">
            {["Legal", "Política de Privacidad", "Firma Electrónica", "Soporte"].map((l) => (
              <a
                key={l}
                href="#"
                className="font-medium transition-colors"
                style={{ color: "#6b7280" }}
              >
                {l}
              </a>
            ))}
          </div>

          <p className="font-medium text-center md:text-right" style={{ color: "#9ca3af" }}>
            © 2025 JUKO_FACT. Sistema SRI Ecuador Autorizado.
          </p>
        </div>
      </footer>

    </div>
  );
}
