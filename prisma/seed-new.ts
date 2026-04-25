/**
 * seed-new.ts — Seed de pruebas para todos los módulos nuevos
 *
 * Cubre: Proveedores, Compras, Inventario (alertas + transferencias), Facturas,
 * Dashboard KPIs y Reportes.
 *
 * Para ejecutar:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-new.ts
 * O con el script npm:
 *   npm run seed:new
 *
 * Empresa de prueba: FacturaTech Demo (RUC 1792345670001)
 * Fecha asumida:     2026-04-25 (Ecuador UTC-5)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!connectionString) throw new Error("DATABASE_URL / DIRECT_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as never);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → medianoche hora Ecuador (UTC-5 = T05:00:00Z). */
function ecuDate(d: string): Date {
  return new Date(`${d}T05:00:00.000Z`);
}

function seq(n: number): string {
  return String(n).padStart(9, "0");
}

type TipoIva = "IVA_0" | "IVA_5" | "IVA_STANDARD" | "NO_APLICA";

const IVA_RATE: Record<TipoIva, number> = {
  IVA_0:        0,
  IVA_5:        5,
  IVA_STANDARD: 15,
  NO_APLICA:    0,
};

interface LineItem {
  productId?: string;
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  tipoIva: TipoIva;
}

/**
 * Replica la aritmética de invoice.repository (acumulación en céntimos).
 */
function computeInvoice(lines: LineItem[]) {
  let s0 = 0, s5 = 0, s15 = 0, sNoIva = 0;
  let descTotal = 0, ivaTotal = 0;

  const details = lines.map((l, i) => {
    const desc = l.descuento ?? 0;
    const net  = Math.round((l.cantidad * l.precioUnitario - desc) * 100) / 100;
    const iva  = Math.round((net * (IVA_RATE[l.tipoIva] / 100)) * 100) / 100;

    descTotal += Math.round(desc * 100);
    ivaTotal  += Math.round(iva  * 100);
    if      (l.tipoIva === "IVA_0")        s0    += Math.round(net * 100);
    else if (l.tipoIva === "IVA_5")        s5    += Math.round(net * 100);
    else if (l.tipoIva === "IVA_STANDARD") s15   += Math.round(net * 100);
    else                                   sNoIva += Math.round(net * 100);

    return {
      productId:              l.productId ?? null,
      codigoPrincipal:        l.codigoPrincipal,
      codigoAuxiliar:         null,
      descripcion:            l.descripcion,
      cantidad:               l.cantidad,
      precioUnitario:         l.precioUnitario,
      descuento:              desc,
      precioTotalSinImpuesto: net,
      tipoIva:                l.tipoIva,
      valorIva:               iva,
      orden:                  i,
    };
  });

  const importeTotal = (s0 + s5 + s15 + sNoIva + ivaTotal) / 100;

  return {
    totals: {
      subtotal0:      s0     / 100,
      subtotal12:     0,
      subtotal5:      s5     / 100,
      subtotal15:     s15    / 100,
      subtotalNoIva:  sNoIva / 100,
      totalDescuento: descTotal / 100,
      totalIva:       ivaTotal  / 100,
      importeTotal,
    },
    details,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log(" SEED-NEW  — FacturaTech Demo");
  console.log("=".repeat(60));

  // ── 1. LIMPIEZA (orden FK-safe) ──────────────────────────────────────────
  console.log("\n[1/9] Limpiando base de datos...");

  await prisma.sRIResponse.deleteMany();
  await prisma.invoiceDetail.deleteMany();
  await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.inventoryProduct.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.company.deleteMany();

  console.log("   ✓ Tablas limpias");

  // ── 2. EMPRESA ───────────────────────────────────────────────────────────
  console.log("\n[2/9] Creando empresa...");

  const company = await prisma.company.create({
    data: {
      ruc:             "1792345670001",
      razonSocial:     "FacturaTech Demo S.A.",
      nombreComercial: "FacturaTech",
      dirMatriz:       "Av. Shyris N36-188 y Suecia, Quito",
      estab:           "001",
      ptoEmi:          "001",
      obligadoContab:  true,
      ambiente:        "PRUEBAS",
      tipoEmision:     "NORMAL",
      businessType:    "GENERAL",
      secuencialInicio:    1,
      secuencialSiguiente: 1,
    },
  });

  const [b1, b2] = await Promise.all([
    prisma.branch.create({
      data: {
        companyId: company.id,
        nombre:    "Principal Quito",
        direccion: "Av. Shyris N36-188 y Suecia",
        active:    true,
      },
    }),
    prisma.branch.create({
      data: {
        companyId: company.id,
        nombre:    "Sucursal Norte",
        direccion: "Av. República del Salvador N34-183",
        active:    true,
      },
    }),
  ]);

  console.log(`   ✓ Empresa: ${company.razonSocial}  (${company.ruc})`);
  console.log(`   ✓ Sucursal 1: ${b1.nombre}`);
  console.log(`   ✓ Sucursal 2: ${b2.nombre}`);

  // ── 3. USUARIOS ──────────────────────────────────────────────────────────
  console.log("\n[3/9] Creando usuarios...");

  const [pwAdmin, pwCajero, pwVendedor] = await Promise.all([
    bcrypt.hash("Admin1234!", 12),
    bcrypt.hash("Cajero1234!", 12),
    bcrypt.hash("Vendedor1234!", 12),
  ]);

  const [uAdmin, uCajero, uVendedor] = await Promise.all([
    prisma.user.create({
      data: {
        email:     "admin@factura.test",
        name:      "Administrador Demo",
        password:  pwAdmin,
        role:      "ADMIN",
        companyId: company.id,
        branchId:  b1.id,
      },
    }),
    prisma.user.create({
      data: {
        email:     "cajero@factura.test",
        name:      "Carlos Cajero",
        password:  pwCajero,
        role:      "EMPLOYED",
        companyId: company.id,
        branchId:  b1.id,
      },
    }),
    prisma.user.create({
      data: {
        email:     "vendedor@factura.test",
        name:      "Verónica Vendedora",
        password:  pwVendedor,
        role:      "EMPLOYED",
        companyId: company.id,
        branchId:  b2.id,
      },
    }),
  ]);

  console.log(`   ✓ ${uAdmin.email} (ADMIN)`);
  console.log(`   ✓ ${uCajero.email} (EMPLOYED, B1)`);
  console.log(`   ✓ ${uVendedor.email} (EMPLOYED, B2)`);

  // ── 4. CLIENTES ──────────────────────────────────────────────────────────
  console.log("\n[4/9] Creando clientes...");

  const [cVega, cLopez, cTechCorp, cMora, cFinal] = await Promise.all([
    prisma.client.create({
      data: {
        companyId:      company.id,
        tipoIdentif:    "CEDULA",
        identificacion: "1712345678",
        razonSocial:    "Andrés Vega Torres",
        email:          "avega@gmail.com",
        telefono:       "0991234567",
      },
    }),
    prisma.client.create({
      data: {
        companyId:      company.id,
        tipoIdentif:    "CEDULA",
        identificacion: "1798765432",
        razonSocial:    "María López Suárez",
        email:          "mlopez@gmail.com",
        telefono:       "0987654321",
      },
    }),
    prisma.client.create({
      data: {
        companyId:      company.id,
        tipoIdentif:    "RUC",
        identificacion: "1791234567001",
        razonSocial:    "Tech Corp S.A.",
        direccion:      "Av. Amazonas N21-147",
        email:          "contacto@techcorp.ec",
      },
    }),
    prisma.client.create({
      data: {
        companyId:      company.id,
        tipoIdentif:    "CEDULA",
        identificacion: "1756789012",
        razonSocial:    "Juan Carlos Mora",
        email:          "jcmora@hotmail.com",
      },
    }),
    prisma.client.create({
      data: {
        companyId:      company.id,
        tipoIdentif:    "CONSUMIDOR_FINAL",
        identificacion: "9999999999999",
        razonSocial:    "Consumidor Final",
      },
    }),
  ]);

  console.log(`   ✓ ${cVega.razonSocial}`);
  console.log(`   ✓ ${cLopez.razonSocial}`);
  console.log(`   ✓ ${cTechCorp.razonSocial}`);
  console.log(`   ✓ ${cMora.razonSocial}`);
  console.log(`   ✓ ${cFinal.razonSocial}`);

  // ── 5. PRODUCTOS ─────────────────────────────────────────────────────────
  console.log("\n[5/9] Creando productos e inventario...");

  const [pServ1, pServ2, pServ3, pBien1, pBien2, pBien3] = await Promise.all([
    prisma.product.create({
      data: {
        companyId:      company.id,
        codigoPrincipal:"SERV001",
        descripcion:    "Consultoría TI por hora",
        precio:         150.00,
        tipoIva:        "IVA_STANDARD",
        tipo:           "SERVICIO",
        unidadMedida:   "UNIDAD",
      },
    }),
    prisma.product.create({
      data: {
        companyId:      company.id,
        codigoPrincipal:"SERV002",
        descripcion:    "Soporte Técnico Remoto",
        precio:         80.00,
        tipoIva:        "IVA_STANDARD",
        tipo:           "SERVICIO",
        unidadMedida:   "UNIDAD",
      },
    }),
    prisma.product.create({
      data: {
        companyId:      company.id,
        codigoPrincipal:"SERV003",
        descripcion:    "Capacitación Digital",
        precio:         120.00,
        tipoIva:        "IVA_0",
        tipo:           "SERVICIO",
        unidadMedida:   "UNIDAD",
      },
    }),
    prisma.product.create({
      data: {
        companyId:      company.id,
        codigoPrincipal:"BIEN001",
        descripcion:    "Laptop HP 15 Core i5",
        precio:         850.00,
        tipoIva:        "IVA_STANDARD",
        tipo:           "BIEN",
        unidadMedida:   "UNIDAD",
        isFavorite:     true,
      },
    }),
    prisma.product.create({
      data: {
        companyId:      company.id,
        codigoPrincipal:"BIEN002",
        descripcion:    "Mouse USB Inalámbrico",
        precio:         25.00,
        tipoIva:        "IVA_STANDARD",
        tipo:           "BIEN",
        unidadMedida:   "UNIDAD",
      },
    }),
    prisma.product.create({
      data: {
        companyId:      company.id,
        codigoPrincipal:"BIEN003",
        descripcion:    "Cable HDMI 2m",
        precio:         12.00,
        tipoIva:        "IVA_0",
        tipo:           "BIEN",
        unidadMedida:   "UNIDAD",
      },
    }),
  ]);

  // Inventory products (solo bienes físicos, tracksInventory=true)
  const [inv1, inv2, inv3] = await Promise.all([
    prisma.inventoryProduct.create({
      data: {
        productId:      pBien1.id,
        companyId:      company.id,
        tracksInventory:true,
        costoPromedio:  650.00,
        stockMinimo:    10,
      },
    }),
    prisma.inventoryProduct.create({
      data: {
        productId:      pBien2.id,
        companyId:      company.id,
        tracksInventory:true,
        costoPromedio:  18.00,
        stockMinimo:    20,
      },
    }),
    prisma.inventoryProduct.create({
      data: {
        productId:      pBien3.id,
        companyId:      company.id,
        tracksInventory:true,
        costoPromedio:  8.00,
        stockMinimo:    5,
      },
    }),
  ]);

  // Stock por sucursal — 4 alertas deliberadas (cantidad <= stockMinimo)
  //
  // BIEN001: B1(3≤10) ALERTA, B2(2≤10) ALERTA
  // BIEN002: B1(50>20) ok,     B2(8≤20)  ALERTA
  // BIEN003: B1(25>5)  ok,     B2(3≤5)   ALERTA
  //
  // Total alertas esperadas: 4
  await Promise.all([
    prisma.stock.create({ data: { companyId: company.id, branchId: b1.id, inventoryProductId: inv1.id, cantidad: 3,  stockMinimo: 10, stockMaximo: 50 } }),
    prisma.stock.create({ data: { companyId: company.id, branchId: b2.id, inventoryProductId: inv1.id, cantidad: 2,  stockMinimo: 10, stockMaximo: 30 } }),
    prisma.stock.create({ data: { companyId: company.id, branchId: b1.id, inventoryProductId: inv2.id, cantidad: 50, stockMinimo: 20, stockMaximo: 200 } }),
    prisma.stock.create({ data: { companyId: company.id, branchId: b2.id, inventoryProductId: inv2.id, cantidad: 8,  stockMinimo: 20, stockMaximo: 100 } }),
    prisma.stock.create({ data: { companyId: company.id, branchId: b1.id, inventoryProductId: inv3.id, cantidad: 25, stockMinimo: 5,  stockMaximo: 100 } }),
    prisma.stock.create({ data: { companyId: company.id, branchId: b2.id, inventoryProductId: inv3.id, cantidad: 3,  stockMinimo: 5,  stockMaximo: 50 } }),
  ]);

  console.log(`   ✓ 6 productos (3 servicios + 3 bienes)`);
  console.log(`   ✓ 3 InventoryProducts (tracksInventory=true)`);
  console.log(`   ✓ 6 Stock records — 4 alertas activas`);

  // ── 6. PROVEEDORES ───────────────────────────────────────────────────────
  console.log("\n[6/9] Creando proveedores...");

  const [sup1, sup2, sup3] = await Promise.all([
    prisma.supplier.create({
      data: {
        companyId: company.id,
        ruc:       "1791111110001",
        nombre:    "TechSupplies Cía. Ltda.",
        email:     "ventas@techsupplies.ec",
        telefono:  "022345678",
        direccion: "Av. 10 de Agosto N20-150, Quito",
        active:    true,
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: company.id,
        ruc:       "1792222220001",
        nombre:    "GlobalComp S.A.",
        email:     "pedidos@globalcomp.ec",
        telefono:  "022789012",
        direccion: "Panamericana Norte km 2, Quito",
        active:    true,
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: company.id,
        ruc:       "1793333330001",
        nombre:    "Cables & Más",
        email:     "info@cablemas.ec",
        telefono:  "0998765432",
        active:    true,
      },
    }),
  ]);

  console.log(`   ✓ ${sup1.nombre}`);
  console.log(`   ✓ ${sup2.nombre}`);
  console.log(`   ✓ ${sup3.nombre}`);

  // ── 7. COMPRAS ───────────────────────────────────────────────────────────
  // Creadas directamente vía Prisma (sin applyMovement) para no alterar el
  // stock deliberado que fijamos arriba.
  console.log("\n[7/9] Creando órdenes de compra...");

  // Marzo 2026 (3 compras)
  const purchase1 = await prisma.purchase.create({
    data: {
      companyId:      company.id,
      branchId:       b1.id,
      userId:         uAdmin.id,
      supplierId:     sup1.id,
      tipoDocumento:  "FACTURA",
      numeroDocumento:"001-001-000001",
      fechaCompra:    ecuDate("2026-03-10"),
      subtotal:       3250.00,
      iva:            0,
      total:          3250.00,
      notas:          "Compra inicial Laptops para stock principal",
      items: {
        create: [{
          productId:    pBien1.id,
          descripcion:  "Laptop HP 15 Core i5",
          cantidad:     5,
          costoUnitario:650.00,
          costoTotal:   3250.00,
        }],
      },
    },
  });

  const purchase2 = await prisma.purchase.create({
    data: {
      companyId:      company.id,
      branchId:       b1.id,
      userId:         uCajero.id,
      supplierId:     sup2.id,
      tipoDocumento:  "FACTURA",
      numeroDocumento:"002-001-000012",
      fechaCompra:    ecuDate("2026-03-15"),
      subtotal:       1800.00,
      iva:            0,
      total:          1800.00,
      items: {
        create: [{
          productId:    pBien2.id,
          descripcion:  "Mouse USB Inalámbrico",
          cantidad:     100,
          costoUnitario:18.00,
          costoTotal:   1800.00,
        }],
      },
    },
  });

  const purchase3 = await prisma.purchase.create({
    data: {
      companyId:      company.id,
      branchId:       b2.id,
      userId:         uVendedor.id,
      supplierId:     sup3.id,
      tipoDocumento:  "NOTA_ENTREGA",
      numeroDocumento:"003-001-000005",
      fechaCompra:    ecuDate("2026-03-20"),
      subtotal:       400.00,
      iva:            0,
      total:          400.00,
      items: {
        create: [{
          productId:    pBien3.id,
          descripcion:  "Cable HDMI 2m",
          cantidad:     50,
          costoUnitario:8.00,
          costoTotal:   400.00,
        }],
      },
    },
  });

  // Abril 2026 (3 compras) — contribuyen a comprasMes del dashboard
  const purchase4 = await prisma.purchase.create({
    data: {
      companyId:      company.id,
      branchId:       b1.id,
      userId:         uAdmin.id,
      supplierId:     sup1.id,
      tipoDocumento:  "FACTURA",
      numeroDocumento:"001-001-000008",
      fechaCompra:    ecuDate("2026-04-01"),
      subtotal:       6500.00,
      iva:            0,
      total:          6500.00,
      notas:          "Reposición de Laptops para el mes",
      items: {
        create: [{
          productId:    pBien1.id,
          descripcion:  "Laptop HP 15 Core i5",
          cantidad:     10,
          costoUnitario:650.00,
          costoTotal:   6500.00,
        }],
      },
    },
  });

  const purchase5 = await prisma.purchase.create({
    data: {
      companyId:      company.id,
      branchId:       b2.id,
      userId:         uVendedor.id,
      supplierId:     sup2.id,
      tipoDocumento:  "FACTURA",
      numeroDocumento:"002-001-000019",
      fechaCompra:    ecuDate("2026-04-10"),
      subtotal:       900.00,
      iva:            0,
      total:          900.00,
      items: {
        create: [{
          productId:    pBien2.id,
          descripcion:  "Mouse USB Inalámbrico",
          cantidad:     50,
          costoUnitario:18.00,
          costoTotal:   900.00,
        }],
      },
    },
  });

  const purchase6 = await prisma.purchase.create({
    data: {
      companyId:      company.id,
      branchId:       b1.id,
      userId:         uCajero.id,
      supplierId:     sup3.id,
      tipoDocumento:  "FACTURA",
      numeroDocumento:"003-001-000011",
      fechaCompra:    ecuDate("2026-04-18"),
      subtotal:       240.00,
      iva:            0,
      total:          240.00,
      items: {
        create: [{
          productId:    pBien3.id,
          descripcion:  "Cable HDMI 2m",
          cantidad:     30,
          costoUnitario:8.00,
          costoTotal:   240.00,
        }],
      },
    },
  });

  const aprilPurchaseTotal = 6500 + 900 + 240; // 7640
  console.log(`   ✓ 3 compras marzo 2026`);
  console.log(`   ✓ 3 compras abril 2026  (total: $${aprilPurchaseTotal.toLocaleString("es-EC")})`);
  void [purchase1, purchase2, purchase3, purchase4, purchase5, purchase6]; // suppress unused

  // ── 8. TRANSFERENCIA DE STOCK ────────────────────────────────────────────
  console.log("\n[8/9] Creando transferencia de stock...");

  // Transfiere BIEN002 x5 de B1 → B2
  await prisma.stockTransfer.create({
    data: {
      companyId:   company.id,
      fromBranchId:b1.id,
      toBranchId:  b2.id,
      userId:      uAdmin.id,
      status:      "COMPLETADA",
      notas:       "Rebalanceo de stock Mouse USB entre sucursales",
      items: {
        create: [{
          inventoryProductId: inv2.id,
          cantidad:           5,
          costoUnitario:      18.00,
        }],
      },
    },
  });

  console.log(`   ✓ Transferencia BIEN002 x5: Principal → Sucursal Norte`);

  // ── 9. FACTURAS ──────────────────────────────────────────────────────────
  console.log("\n[9/9] Creando facturas...");

  // Usamos upsert por (companyId, secuencial) para idempotencia.
  // secuencialSiguiente se actualiza al final.

  type EstadoComprobante = "PENDIENTE" | "ENVIADO" | "DEVUELTA" | "AUTORIZADO" | "RECHAZADO" | "ANULADO";

  async function upsertInvoice(
    n: number,
    clientId: string,
    branchId: string,
    fechaStr: string,
    estado: EstadoComprobante,
    lines: LineItem[]
  ) {
    const { totals, details } = computeInvoice(lines);
    const secuencial = seq(n);
    const fechaEmision = ecuDate(fechaStr);

    return prisma.invoice.upsert({
      where:  { companyId_secuencial: { companyId: company.id, secuencial } },
      update: {},
      create: {
        companyId,
        clientId,
        branchId,
        secuencial,
        ambiente:    "PRUEBAS",
        estado,
        fechaEmision,
        formaPago:   "01",
        ...totals,
        details:     { create: details },
      },
    });
  }

  const companyId = company.id;

  // ── HOY (2026-04-25) — 3 facturas AUTORIZADO ──────────────────────────
  await upsertInvoice(1, cVega.id, b1.id, "2026-04-25", "AUTORIZADO", [
    { productId: pBien1.id, codigoPrincipal: "BIEN001", descripcion: "Laptop HP 15 Core i5",   cantidad: 1, precioUnitario: 850.00, tipoIva: "IVA_STANDARD" },
    { productId: pServ2.id, codigoPrincipal: "SERV002", descripcion: "Soporte Técnico Remoto",  cantidad: 1, precioUnitario:  80.00, tipoIva: "IVA_STANDARD" },
  ]);
  // subtotal15=930, iva=139.50, total=1069.50

  await upsertInvoice(2, cLopez.id, b1.id, "2026-04-25", "AUTORIZADO", [
    { productId: pServ1.id, codigoPrincipal: "SERV001", descripcion: "Consultoría TI por hora", cantidad: 2, precioUnitario: 150.00, tipoIva: "IVA_STANDARD" },
  ]);
  // subtotal15=300, iva=45, total=345.00

  await upsertInvoice(3, cTechCorp.id, b2.id, "2026-04-25", "AUTORIZADO", [
    { productId: pBien2.id, codigoPrincipal: "BIEN002", descripcion: "Mouse USB Inalámbrico",  cantidad: 5, precioUnitario:  25.00, tipoIva: "IVA_STANDARD" },
    { productId: pBien3.id, codigoPrincipal: "BIEN003", descripcion: "Cable HDMI 2m",           cantidad: 3, precioUnitario:  12.00, tipoIva: "IVA_0" },
  ]);
  // subtotal15=125, subtotal0=36, iva=18.75, total=179.75

  // ── ABRIL (no hoy) — AUTORIZADO ───────────────────────────────────────
  await upsertInvoice(4, cMora.id, b1.id, "2026-04-01", "AUTORIZADO", [
    { productId: pServ1.id, codigoPrincipal: "SERV001", descripcion: "Consultoría TI por hora", cantidad: 1, precioUnitario: 150.00, tipoIva: "IVA_STANDARD" },
  ]);
  // subtotal15=150, iva=22.50, total=172.50

  await upsertInvoice(5, cFinal.id, b1.id, "2026-04-05", "AUTORIZADO", [
    { productId: pBien1.id, codigoPrincipal: "BIEN001", descripcion: "Laptop HP 15 Core i5",   cantidad: 1, precioUnitario: 850.00, tipoIva: "IVA_STANDARD" },
  ]);
  // subtotal15=850, iva=127.50, total=977.50

  await upsertInvoice(7, cVega.id, b2.id, "2026-04-15", "AUTORIZADO", [
    { productId: pServ3.id, codigoPrincipal: "SERV003", descripcion: "Capacitación Digital",    cantidad: 1, precioUnitario: 120.00, tipoIva: "IVA_0" },
  ]);
  // subtotal0=120, iva=0, total=120.00

  // ── ABRIL (no hoy) — PENDIENTE ────────────────────────────────────────
  await upsertInvoice(6, cLopez.id, b1.id, "2026-04-10", "PENDIENTE", [
    { productId: pServ2.id, codigoPrincipal: "SERV002", descripcion: "Soporte Técnico Remoto",  cantidad: 3, precioUnitario:  80.00, tipoIva: "IVA_STANDARD" },
  ]);
  // subtotal15=240, iva=36, total=276.00

  await upsertInvoice(8, cTechCorp.id, b2.id, "2026-04-20", "PENDIENTE", [
    { productId: pBien2.id, codigoPrincipal: "BIEN002", descripcion: "Mouse USB Inalámbrico",  cantidad: 10, precioUnitario: 25.00, tipoIva: "IVA_STANDARD" },
  ]);
  // subtotal15=250, iva=37.50, total=287.50

  // ── MARZO 2026 — AUTORIZADO ───────────────────────────────────────────
  await upsertInvoice(9, cVega.id, b1.id, "2026-03-10", "AUTORIZADO", [
    { productId: pServ1.id, codigoPrincipal: "SERV001", descripcion: "Consultoría TI por hora", cantidad: 2, precioUnitario: 150.00, tipoIva: "IVA_STANDARD" },
  ]);
  // subtotal15=300, iva=45, total=345.00

  await upsertInvoice(10, cLopez.id, b1.id, "2026-03-15", "AUTORIZADO", [
    { productId: pBien1.id, codigoPrincipal: "BIEN001", descripcion: "Laptop HP 15 Core i5",   cantidad: 1, precioUnitario: 850.00, tipoIva: "IVA_STANDARD" },
  ]);
  // subtotal15=850, iva=127.50, total=977.50

  await upsertInvoice(11, cMora.id, b1.id, "2026-03-20", "AUTORIZADO", [
    { productId: pServ2.id, codigoPrincipal: "SERV002", descripcion: "Soporte Técnico Remoto",  cantidad: 4, precioUnitario:  80.00, tipoIva: "IVA_STANDARD" },
  ]);
  // subtotal15=320, iva=48, total=368.00

  await upsertInvoice(12, cFinal.id, b2.id, "2026-03-25", "AUTORIZADO", [
    { productId: pServ3.id, codigoPrincipal: "SERV003", descripcion: "Capacitación Digital",    cantidad: 3, precioUnitario: 120.00, tipoIva: "IVA_0" },
    { productId: pBien3.id, codigoPrincipal: "BIEN003", descripcion: "Cable HDMI 2m",            cantidad: 10, precioUnitario: 12.00, tipoIva: "IVA_0" },
  ]);
  // subtotal0=360+120=480, iva=0, total=480.00

  // ── ANULADAS (excluidas de KPIs) ──────────────────────────────────────
  await upsertInvoice(13, cVega.id, b1.id, "2026-04-03", "ANULADO", [
    { productId: pServ1.id, codigoPrincipal: "SERV001", descripcion: "Consultoría TI por hora", cantidad: 1, precioUnitario: 150.00, tipoIva: "IVA_STANDARD" },
  ]);

  await upsertInvoice(14, cLopez.id, b1.id, "2026-03-05", "ANULADO", [
    { productId: pBien2.id, codigoPrincipal: "BIEN002", descripcion: "Mouse USB Inalámbrico",  cantidad: 2, precioUnitario:  25.00, tipoIva: "IVA_STANDARD" },
  ]);

  // ── RECHAZADA (excluida de KPIs) ──────────────────────────────────────
  await upsertInvoice(15, cTechCorp.id, b2.id, "2026-04-08", "RECHAZADO", [
    { productId: pServ2.id, codigoPrincipal: "SERV002", descripcion: "Soporte Técnico Remoto",  cantidad: 1, precioUnitario:  80.00, tipoIva: "IVA_STANDARD" },
  ]);

  // Actualizar secuencialSiguiente al siguiente número disponible
  await prisma.company.update({
    where: { id: company.id },
    data:  { secuencialSiguiente: 16 },
  });

  console.log(`   ✓ 15 facturas creadas:`);
  console.log(`     Hoy       (AUTORIZADO): #1 #2 #3`);
  console.log(`     Abril     (AUTORIZADO): #4 #5 #7`);
  console.log(`     Abril     (PENDIENTE):  #6 #8`);
  console.log(`     Marzo     (AUTORIZADO): #9 #10 #11 #12`);
  console.log(`     ANULADO:               #13 #14`);
  console.log(`     RECHAZADO:             #15`);

  // ── RESUMEN / VALIDACIÓN ─────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(" RESUMEN — Valores esperados en el Dashboard (2026-04-25)");
  console.log("=".repeat(60));

  console.log(`
┌─────────────────────────────────────────────────────────┐
│  FACTURACIÓN — Abril 2026                               │
├───────────────────────────────┬─────────────────────────┤
│  Ventas Hoy                   │  $1,594.25  (3 fact.)   │
│    #1 Vega (Laptop+Soporte)   │  $1,069.50              │
│    #2 López (Consultoría x2)  │    $345.00              │
│    #3 TechCorp (Mouse+HDMI)   │    $179.75              │
├───────────────────────────────┼─────────────────────────┤
│  Ventas del Mes (AUTORIZADO)  │  $2,864.25  (6 fact.)   │
│    Hoy (#1+#2+#3)             │  $1,594.25              │
│    #4 Mora  (Consultoría)     │    $172.50              │
│    #5 Final (Laptop)          │    $977.50              │
│    #7 Vega  (Capacitación)    │    $120.00              │
├───────────────────────────────┼─────────────────────────┤
│  IVA del Mes                  │    $353.25              │
│  Compras del Mes (3 órdenes)  │  $7,640.00              │
│    #4 Laptops x10             │  $6,500.00              │
│    #5 Mouse x50               │    $900.00              │
│    #6 HDMI x30                │    $240.00              │
├───────────────────────────────┴─────────────────────────┤
│  ESTADO SRI — Histórico                                 │
├───────────────────────────────┬─────────────────────────┤
│  Total Facturas               │  15                     │
│  Autorizadas                  │  10                     │
│  Pendientes SRI               │  2   (#6 #8)            │
│  Anuladas                     │  2   (#13 #14)          │
│  Rechazadas                   │  1   (#15)              │
├───────────────────────────────┼─────────────────────────┤
│  Alertas Inventario           │  4                      │
│    BIEN001 B1 (3 ≤ 10)        │  ALERTA                 │
│    BIEN001 B2 (2 ≤ 10)        │  ALERTA                 │
│    BIEN002 B2 (8 ≤ 20)        │  ALERTA                 │
│    BIEN003 B2 (3 ≤  5)        │  ALERTA                 │
└───────────────────────────────┴─────────────────────────┘

 Credenciales de acceso:
   admin@factura.test     →  Admin1234!    (ADMIN)
   cajero@factura.test    →  Cajero1234!   (EMPLOYED, B1)
   vendedor@factura.test  →  Vendedor1234! (EMPLOYED, B2)
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
