/**
 * Generates an HTML-based RIDE (Representación Impresa del Documento Electrónico)
 * for an authorized invoice. The HTML is styled for printing and can be saved as PDF
 * via browser print dialog or a headless browser.
 */
import type { Invoice, Company, Client, InvoiceDetail } from "@prisma/client";
import { IVA_RATES } from "@/types";

type InvoiceWithRelations = Invoice & {
  company: Company;
  client: Client;
  details: InvoiceDetail[];
};

export function generateRIDEHtml(invoice: InvoiceWithRelations): string {
  const { company, client, details } = invoice;
  const fechaEmision = formatDate(invoice.fechaEmision);
  const ambiente =
    invoice.ambiente === "PRODUCCION" ? "PRODUCCIÓN" : "PRUEBAS";
  const serie = `${company.estab}-${company.ptoEmi}-${invoice.secuencial}`;

  const detailRows = details
    .map(
      (d) => `
    <tr>
      <td>${d.codigoPrincipal}</td>
      <td>${d.descripcion}</td>
      <td class="right">${Number(d.cantidad).toFixed(2)}</td>
      <td class="right">$${Number(d.precioUnitario).toFixed(2)}</td>
      <td class="right">$${Number(d.descuento).toFixed(2)}</td>
      <td class="right">$${Number(d.precioTotalSinImpuesto).toFixed(2)}</td>
      <td class="right">${IVA_RATES[d.tipoIva] ?? 0}%</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>RIDE - Factura ${serie}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; }
  .container { max-width: 800px; margin: 0 auto; }
  .header { display: flex; gap: 10px; margin-bottom: 15px; border: 1px solid #000; }
  .header-left { width: 30%; padding: 10px; border-right: 1px solid #000; text-align: center; }
  .header-left .company-name { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
  .header-center { width: 40%; padding: 10px; border-right: 1px solid #000; }
  .header-right { width: 30%; padding: 10px; }
  .header-right .doc-title { font-size: 13px; font-weight: bold; text-align: center; margin-bottom: 8px; }
  .info-box { border: 1px solid #000; padding: 8px; margin-bottom: 10px; }
  .info-row { display: flex; margin-bottom: 3px; }
  .info-label { font-weight: bold; min-width: 160px; }
  .access-key { font-size: 9px; letter-spacing: 1px; word-break: break-all; text-align: center;
    border: 1px solid #000; padding: 4px; margin-bottom: 10px; background: #f5f5f5; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #e0e0e0; border: 1px solid #000; padding: 5px; text-align: left; }
  td { border: 1px solid #ccc; padding: 4px 5px; }
  .right { text-align: right; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-table { width: 280px; border-collapse: collapse; }
  .totals-table td { border: 1px solid #000; padding: 4px 8px; }
  .totals-table .label { font-weight: bold; }
  .totals-table .total-row { font-weight: bold; background: #e0e0e0; font-size: 13px; }
  .ambiente-badge { display: inline-block; padding: 2px 8px; border-radius: 3px;
    font-weight: bold; font-size: 10px;
    background: ${invoice.ambiente === "PRODUCCION" ? "#d4edda" : "#fff3cd"};
    color: ${invoice.ambiente === "PRODUCCION" ? "#155724" : "#856404"};
    border: 1px solid ${invoice.ambiente === "PRODUCCION" ? "#c3e6cb" : "#ffc107"}; }
  .auth-info { border: 2px solid #28a745; padding: 8px; margin-bottom: 10px; background: #f8fff9; }
  .auth-info h3 { color: #28a745; margin-bottom: 5px; }
  @media print {
    body { padding: 5mm; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="company-name">${company.razonSocial}</div>
      ${company.nombreComercial ? `<div>${company.nombreComercial}</div>` : ""}
      <div style="margin-top:5px">Dir: ${company.dirMatriz}</div>
      <div>RUC: ${company.ruc}</div>
    </div>
    <div class="header-center">
      <div><strong>Dirección Matriz:</strong> ${company.dirMatriz}</div>
      <div><strong>Dirección Sucursal:</strong> ${company.dirMatriz}</div>
      <div style="margin-top:8px">
        <strong>Contribuyente Especial:</strong>
        ${company.contribuyenteEsp ?? "NO APLICA"}
      </div>
      <div><strong>Obligado a llevar Contabilidad:</strong>
        ${company.obligadoContab ? "SI" : "NO"}
      </div>
      <div><strong>Resolución No.:</strong> -</div>
      <div style="margin-top:5px">
        <span class="ambiente-badge">${ambiente}</span>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-title">FACTURA</div>
      <div style="margin-bottom:4px"><strong>No.</strong> ${serie}</div>
      <div><strong>NÚMERO DE AUTORIZACIÓN:</strong></div>
      <div style="font-size:9px; word-break:break-all;">
        ${invoice.numeroAutorizacion ?? "PENDIENTE"}
      </div>
      <div style="margin-top:5px">
        <strong>FECHA Y HORA DE AUTORIZACIÓN:</strong>
      </div>
      <div>
        ${invoice.fechaAutorizacion ? formatDatetime(invoice.fechaAutorizacion) : "PENDIENTE"}
      </div>
    </div>
  </div>

  <!-- Clave de acceso -->
  <div>
    <strong>CLAVE DE ACCESO:</strong>
    <div class="access-key">${invoice.claveAcceso ?? "Pendiente de generación"}</div>
  </div>

  <!-- Datos del comprador -->
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">Fecha de Emisión:</span>
      <span>${fechaEmision}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Razón Social / Nombres:</span>
      <span>${client.razonSocial}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Identificación:</span>
      <span>${client.identificacion}</span>
    </div>
    ${client.direccion ? `<div class="info-row"><span class="info-label">Dirección:</span><span>${client.direccion}</span></div>` : ""}
    ${client.email ? `<div class="info-row"><span class="info-label">Email:</span><span>${client.email}</span></div>` : ""}
    ${client.telefono ? `<div class="info-row"><span class="info-label">Teléfono:</span><span>${client.telefono}</span></div>` : ""}
  </div>

  <!-- Detalles -->
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Descripción</th>
        <th class="right">Cant.</th>
        <th class="right">P. Unitario</th>
        <th class="right">Descuento</th>
        <th class="right">P. Total</th>
        <th class="right">IVA</th>
      </tr>
    </thead>
    <tbody>
      ${detailRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <table class="totals-table">
      ${Number(invoice.subtotal0) > 0 ? `<tr><td class="label">SUBTOTAL IVA 0%</td><td class="right">$${Number(invoice.subtotal0).toFixed(2)}</td></tr>` : ""}
      ${Number(invoice.subtotal12) > 0 ? `<tr><td class="label">SUBTOTAL IVA 12%</td><td class="right">$${Number(invoice.subtotal12).toFixed(2)}</td></tr>` : ""}
      ${Number(invoice.subtotal5) > 0 ? `<tr><td class="label">SUBTOTAL IVA 5%</td><td class="right">$${Number(invoice.subtotal5).toFixed(2)}</td></tr>` : ""}
      ${Number(invoice.subtotal15) > 0 ? `<tr><td class="label">SUBTOTAL IVA 15%</td><td class="right">$${Number(invoice.subtotal15).toFixed(2)}</td></tr>` : ""}
      ${Number(invoice.subtotalNoIva) > 0 ? `<tr><td class="label">SUBTOTAL NO OBJETO IVA</td><td class="right">$${Number(invoice.subtotalNoIva).toFixed(2)}</td></tr>` : ""}
      <tr><td class="label">DESCUENTO</td><td class="right">$${Number(invoice.totalDescuento).toFixed(2)}</td></tr>
      <tr><td class="label">IVA</td><td class="right">$${Number(invoice.totalIva).toFixed(2)}</td></tr>
      <tr><td class="label">PROPINA</td><td class="right">$${Number(invoice.propina).toFixed(2)}</td></tr>
      <tr class="total-row"><td class="label">VALOR TOTAL</td><td class="right">$${Number(invoice.importeTotal).toFixed(2)}</td></tr>
    </table>
  </div>

  ${invoice.observaciones ? `<div class="info-box" style="margin-top:10px"><strong>Observaciones:</strong> ${invoice.observaciones}</div>` : ""}

  <!-- Footer -->
  <div style="margin-top:15px; font-size:9px; text-align:center; color:#666;">
    Documento generado por sistema de facturación electrónica.
    Este documento es una representación impresa del comprobante electrónico.
  </div>

</div>
<script>
  window.addEventListener('load', () => window.print());
</script>
</body>
</html>`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDatetime(date: Date): string {
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
