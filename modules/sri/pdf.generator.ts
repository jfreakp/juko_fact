/**
 * Generates an HTML-based RIDE (Representación Impresa del Documento Electrónico)
 * for an authorized invoice. Designed to match the official SRI Ecuador RIDE format.
 * Uses JsBarcode (CDN) for the CODE-128 access key barcode.
 */
import type { Invoice, Company, Client, InvoiceDetail } from "@prisma/client";
import { IVA_RATES } from "@/types";

type InvoiceWithRelations = Invoice & {
  company: Company;
  client: Client;
  details: InvoiceDetail[];
};

export function generateRIDEHtml(
  invoice: InvoiceWithRelations,
  logoDataUri?: string
): string {
  const { company, client, details } = invoice;

  const fechaEmision = formatDate(invoice.fechaEmision);
  const fechaAuth = invoice.fechaAutorizacion
    ? formatDatetime(invoice.fechaAutorizacion)
    : "PENDIENTE";
  const ambienteLabel =
    invoice.ambiente === "PRODUCCION" ? "PRODUCCIÓN" : "PRUEBAS";
  const emisionLabel =
    (invoice as { tipoEmision?: string }).tipoEmision === "INDISPONIBILIDAD"
      ? "INDISPONIBILIDAD DEL SISTEMA"
      : "NORMAL";
  const serie = `${company.estab}-${company.ptoEmi}-${invoice.secuencial}`;
  const claveAcceso = invoice.claveAcceso ?? "";

  const detailRows = details
    .map(
      (d, i) => `
    <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
      <td class="center">${d.codigoPrincipal}</td>
      <td class="center">${Number(d.cantidad).toFixed(2)}</td>
      <td>${escHtml(d.descripcion)}</td>
      <td class="right">$${Number(d.precioUnitario).toFixed(4)}</td>
      <td class="right">$${Number(d.descuento).toFixed(2)}</td>
      <td class="right">$${Number(d.precioTotalSinImpuesto).toFixed(2)}</td>
    </tr>`
    )
    .join("");

  // Subtotals rows (only show non-zero)
  const subtotalRows = [
    { label: "SUBTOTAL 0%",   value: Number(invoice.subtotal0) },
    { label: "SUBTOTAL 5%",   value: Number(invoice.subtotal5) },
    { label: `SUBTOTAL ${process.env.NEXT_PUBLIC_IVA_RATE ?? 15}%`, value: Number(invoice.subtotal15) },
  ]
    .filter((r) => r.value > 0)
    .map(
      (r) =>
        `<tr><td class="tot-label">${r.label}</td><td class="tot-value">$${r.value.toFixed(2)}</td></tr>`
    )
    .join("");

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="Logo" class="logo-img"/>`
    : `<div class="logo-placeholder"><span>${escHtml(company.razonSocial.charAt(0))}</span></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>RIDE — Factura ${serie}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<style>
  /* ── Reset & base ── */
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: #1a1a1a;
    background: #fff;
    padding: 18px 22px;
  }
  .page { max-width: 820px; margin: 0 auto; }

  /* ── Header ── */
  .header {
    display: flex;
    gap: 0;
    margin-bottom: 0;
    border: 1.5px solid #1a1a1a;
  }
  .header-left {
    width: 38%;
    padding: 12px 14px;
    border-right: 1.5px solid #1a1a1a;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .logo-img {
    max-height: 80px;
    max-width: 180px;
    object-fit: contain;
    margin-bottom: 6px;
    align-self: center;
  }
  .logo-placeholder {
    width: 72px; height: 72px;
    border-radius: 8px;
    background: #1a1a1a;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 6px;
    align-self: center;
  }
  .logo-placeholder span { color:#fff; font-size:32px; font-weight:900; }
  .co-name { font-size:12px; font-weight:700; text-transform:uppercase; }
  .co-sub  { font-size:9px; font-weight:700; margin-top:2px; }
  .co-line { font-size:9px; color:#333; line-height:1.4; }

  .header-right {
    flex: 1;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ruc-line { font-size:12px; font-weight:700; text-align:center; margin-bottom:4px; }
  .doc-type { font-size:18px; font-weight:900; text-align:center; text-transform:uppercase; margin-bottom:1px; }
  .doc-serie { font-size:12px; font-weight:700; text-align:center; color:#705D00; margin-bottom:8px; }

  .field-label { font-size:8px; font-weight:700; text-transform:uppercase; color:#555; margin-top:4px; }
  .field-value { font-size:9px; color:#1a1a1a; word-break:break-all; }
  .field-value.mono { font-family: 'Courier New', monospace; font-size:8px; letter-spacing:0.3px; }

  .barcode-wrap { margin-top:6px; text-align:center; }
  .barcode-wrap svg { max-width:100%; height:50px; }
  .barcode-num { font-family:'Courier New',monospace; font-size:7.5px; letter-spacing:0.5px; margin-top:2px; word-break:break-all; }

  .env-badge {
    display:inline-block;
    padding:1px 8px;
    border-radius:2px;
    font-weight:700;
    font-size:9px;
    margin-top:3px;
    background:${invoice.ambiente === "PRODUCCION" ? "#d1fae5" : "#fef3c7"};
    color:${invoice.ambiente === "PRODUCCION" ? "#065f46" : "#92400e"};
    border:1px solid ${invoice.ambiente === "PRODUCCION" ? "#6ee7b7" : "#fcd34d"};
  }

  /* ── Client box ── */
  .client-box {
    border-left: 1.5px solid #1a1a1a;
    border-right: 1.5px solid #1a1a1a;
    border-bottom: 1.5px solid #1a1a1a;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }
  .client-cell {
    padding: 6px 10px;
    border-right: 1px solid #ccc;
  }
  .client-cell:last-child { border-right: none; }
  .client-row { display:flex; gap:4px; margin-bottom:2px; }
  .client-lbl { font-weight:700; white-space:nowrap; }

  /* ── Section title ── */
  .section-title {
    background: #1a1a1a;
    color: #fff;
    font-weight:700;
    font-size:9px;
    text-transform:uppercase;
    padding: 3px 8px;
    letter-spacing: 0.5px;
    margin-top: 8px;
  }

  /* ── Details table ── */
  table.details {
    width:100%;
    border-collapse:collapse;
    margin-top:0;
    border-left:1.5px solid #1a1a1a;
    border-right:1.5px solid #1a1a1a;
    border-bottom:1.5px solid #1a1a1a;
  }
  table.details th {
    background:#404040;
    color:#fff;
    font-size:9px;
    font-weight:700;
    text-transform:uppercase;
    padding:5px 6px;
    border-right:1px solid #666;
    text-align:left;
  }
  table.details th.center, table.details td.center { text-align:center; }
  table.details th.right, table.details td.right { text-align:right; }
  table.details th:last-child { border-right:none; }
  table.details td {
    padding:4px 6px;
    border-right:1px solid #ddd;
    border-top:1px solid #eee;
    font-size:9.5px;
  }
  table.details td:last-child { border-right:none; }
  .row-even { background:#fff; }
  .row-odd  { background:#f8f8f8; }

  /* ── Bottom section: payment + totals ── */
  .bottom-section {
    display:flex;
    gap:0;
    margin-top:8px;
    border:1.5px solid #1a1a1a;
  }
  .payment-col {
    width:45%;
    border-right:1.5px solid #1a1a1a;
    padding:8px 10px;
  }
  .payment-title {
    font-weight:700;
    font-size:9px;
    text-transform:uppercase;
    margin-bottom:5px;
    border-bottom:1px solid #ccc;
    padding-bottom:3px;
  }
  table.payment {
    width:100%;
    border-collapse:collapse;
  }
  table.payment th {
    background:#e8e8e8;
    font-size:8.5px;
    font-weight:700;
    text-transform:uppercase;
    padding:3px 5px;
    border:1px solid #ccc;
    text-align:left;
  }
  table.payment td {
    font-size:9px;
    padding:3px 5px;
    border:1px solid #ddd;
  }

  .totals-col { flex:1; padding:0; }
  table.totals {
    width:100%;
    border-collapse:collapse;
    height:100%;
  }
  table.totals td {
    padding:4px 10px;
    border-top:1px solid #eee;
    font-size:9.5px;
  }
  .tot-label { font-weight:600; color:#444; }
  .tot-value { text-align:right; font-weight:600; }
  .tot-grand { background:#1a1a1a; color:#FFD700; font-size:11px; font-weight:900; }
  .tot-grand td { border-top:2px solid #000; padding:5px 10px; }

  /* ── Additional info ── */
  .add-info {
    margin-top:8px;
    border:1.5px solid #1a1a1a;
  }
  .add-info-title {
    background:#e8e8e8;
    font-weight:700;
    font-size:9px;
    text-transform:uppercase;
    padding:3px 8px;
    border-bottom:1px solid #ccc;
  }
  .add-info-grid {
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:0;
    padding:6px 10px;
  }
  .add-info-row {
    display:flex;
    gap:6px;
    padding:2px 0;
    font-size:9px;
  }
  .add-info-key { font-weight:700; white-space:nowrap; }

  /* ── Footer ── */
  .footer {
    margin-top:12px;
    text-align:center;
    font-size:8px;
    color:#666;
    border-top:1px solid #ddd;
    padding-top:6px;
  }

  /* ── Print ── */
  @media print {
    body { padding:5mm 8mm; }
    .no-print { display:none !important; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- ══ HEADER ══ -->
  <div class="header">
    <!-- Left: logo + company -->
    <div class="header-left">
      ${logoHtml}
      <div class="co-name">${escHtml(company.razonSocial)}</div>
      ${company.nombreComercial ? `<div class="co-sub">${escHtml(company.nombreComercial)}</div>` : ""}
      <div class="co-line" style="margin-top:4px">
        <strong>Dir. Matriz</strong><br>
        ${escHtml(company.dirMatriz)}
      </div>
      <div class="co-line">Obligado a llevar contabilidad: ${company.obligadoContab ? "SI" : "NO"}</div>
      ${company.contribuyenteEsp ? `<div class="co-line">Agente de Retención Resolución Nro: ${escHtml(company.contribuyenteEsp)}</div>` : ""}
    </div>

    <!-- Right: RUC / doc info / barcode -->
    <div class="header-right">
      <div class="ruc-line">RUC: ${escHtml(company.ruc)}</div>
      <div class="doc-type">FACTURA</div>
      <div class="doc-serie">Nro: ${serie}</div>

      <div class="field-label">Número de Autorización</div>
      <div class="field-value mono">${invoice.numeroAutorizacion ?? "PENDIENTE"}</div>

      <div class="field-label">Fecha y Hora de Autorización</div>
      <div class="field-value">${fechaAuth}</div>

      <div style="display:flex; gap:12px; margin-top:4px;">
        <div>
          <div class="field-label">Ambiente</div>
          <span class="env-badge">${ambienteLabel}</span>
        </div>
        <div>
          <div class="field-label">Emisión</div>
          <div class="field-value" style="margin-top:3px">${emisionLabel}</div>
        </div>
      </div>

      <div class="field-label" style="margin-top:6px"><strong>Clave de Acceso</strong></div>
      ${claveAcceso ? `
      <div class="barcode-wrap">
        <svg id="barcode"></svg>
        <div class="barcode-num">${claveAcceso}</div>
      </div>` : `<div class="field-value mono">${"PENDIENTE"}</div>`}
    </div>
  </div>

  <!-- ══ CLIENT INFO ══ -->
  <div class="client-box">
    <div class="client-cell">
      <div class="client-row">
        <span class="client-lbl">Razón social:</span>
        <span>${escHtml(client.razonSocial)}</span>
      </div>
      <div class="client-row">
        <span class="client-lbl">Fecha de emisión:</span>
        <span>${fechaEmision}</span>
      </div>
      ${client.direccion ? `<div class="client-row"><span class="client-lbl">Dirección:</span><span>${escHtml(client.direccion)}</span></div>` : ""}
    </div>
    <div class="client-cell">
      <div class="client-row">
        <span class="client-lbl">CI/RUC:</span>
        <span>${escHtml(client.identificacion)}</span>
      </div>
      <div class="client-row">
        <span class="client-lbl">Guía de remisión:</span>
        <span></span>
      </div>
      ${client.email ? `<div class="client-row"><span class="client-lbl">Email:</span><span>${escHtml(client.email)}</span></div>` : ""}
    </div>
  </div>

  <!-- ══ DETAILS ══ -->
  <div class="section-title">Detalle de Productos / Servicios</div>
  <table class="details">
    <thead>
      <tr>
        <th class="center" style="width:70px">Cod. Principal</th>
        <th class="center" style="width:55px">Cantidad</th>
        <th>Descripción</th>
        <th class="right" style="width:80px">Precio Unitario</th>
        <th class="right" style="width:70px">Descuento</th>
        <th class="right" style="width:75px">Precio Total</th>
      </tr>
    </thead>
    <tbody>
      ${detailRows}
    </tbody>
  </table>

  <!-- ══ PAYMENT + TOTALS ══ -->
  <div class="bottom-section">
    <!-- Payment methods -->
    <div class="payment-col">
      <div class="payment-title">Formas de Pago</div>
      <table class="payment">
        <thead>
          <tr>
            <th>Descripción</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>EFECTIVO / TRANSFERENCIA</td>
            <td style="text-align:right">$${Number(invoice.importeTotal).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals-col">
      <table class="totals">
        <tbody>
          ${subtotalRows}
          <tr>
            <td class="tot-label">SUBTOTAL</td>
            <td class="tot-value">$${(Number(invoice.subtotal0) + Number(invoice.subtotal12) + Number(invoice.subtotal5) + Number(invoice.subtotal15)).toFixed(2)}</td>
          </tr>
          <tr>
            <td class="tot-label">DESCUENTO</td>
            <td class="tot-value">$${Number(invoice.totalDescuento).toFixed(2)}</td>
          </tr>
          <tr>
            <td class="tot-label">IVA</td>
            <td class="tot-value">$${Number(invoice.totalIva).toFixed(2)}</td>
          </tr>
          <tr class="tot-grand">
            <td class="tot-label">VALOR TOTAL</td>
            <td class="tot-value">$${Number(invoice.importeTotal).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ ADDITIONAL INFO ══ -->
  ${invoice.observaciones || client.telefono || client.email ? `
  <div class="add-info">
    <div class="add-info-title">Información Adicional</div>
    <div class="add-info-grid">
      ${client.direccion ? `<div class="add-info-row"><span class="add-info-key">DIRECCIÓN DEL ADQUIRENTE</span><span>${escHtml(client.direccion)}</span></div>` : ""}
      ${client.telefono ? `<div class="add-info-row"><span class="add-info-key">TELÉFONO DEL ADQUIRENTE</span><span>${escHtml(client.telefono)}</span></div>` : ""}
      ${client.email ? `<div class="add-info-row"><span class="add-info-key">EMAIL DEL ADQUIRENTE</span><span>${escHtml(client.email)}</span></div>` : ""}
      ${invoice.observaciones ? `<div class="add-info-row"><span class="add-info-key">OBSERVACIÓN</span><span>${escHtml(invoice.observaciones)}</span></div>` : ""}
    </div>
  </div>` : ""}

  <!-- ══ FOOTER ══ -->
  <div class="footer">
    Comprobante electrónico impreso el ${formatDatetime(new Date())} &nbsp;·&nbsp; 1 de 1
  </div>

</div>

<script>
  (function() {
    ${claveAcceso ? `
    try {
      JsBarcode("#barcode", "${claveAcceso}", {
        format: "CODE128",
        lineColor: "#1a1a1a",
        width: 1.4,
        height: 48,
        displayValue: false,
        margin: 0
      });
    } catch(e) { /* barcode optional */ }` : ""}
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  })();
<\/script>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatDatetime(date: Date): string {
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}
