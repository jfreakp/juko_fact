import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as never);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hashAll(passwords: string[]) {
  return Promise.all(passwords.map((p) => bcrypt.hash(p, 12)));
}

/** Convierte "YYYY-MM-DD" a medianoche Ecuador (UTC-5 = 05:00 UTC). */
function ecuDate(d: string): Date {
  return new Date(`${d}T05:00:00.000Z`);
}

/** Genera fecha aleatoria entre dos fechas (inclusive). */
function randDate(from: string, to: string): Date {
  const start = ecuDate(from).getTime();
  const end   = ecuDate(to).getTime();
  const ts    = start + Math.floor(Math.random() * (end - start + 86_400_000));
  return new Date(ts);
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
 * Calcula totales de cabecera y detalles a partir de líneas de producto.
 * Replica la lógica de invoice.repository para producir los mismos valores.
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
      subtotal0:      s0    / 100,
      subtotal12:     0,
      subtotal5:      s5    / 100,
      subtotal15:     s15   / 100,
      subtotalNoIva:  sNoIva / 100,
      totalDescuento: descTotal / 100,
      totalIva:       ivaTotal  / 100,
      importeTotal,
    },
    details,
  };
}

function seq(n: number): string {
  return String(n).padStart(9, "0");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed de base de datos...\n");

  // ══════════════════════════════════════════════════════════════════════════
  // EMPRESA 1 — TechSoluciones (empresa de tecnología con 3 sucursales)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("── Empresa 1: TechSoluciones S.A. ──────────────────────────");

  const tech = await prisma.company.upsert({
    where: { ruc: "1791234560001" },
    update: {},
    create: {
      ruc: "1791234560001",
      razonSocial: "TECHSOLUCIONES S.A.",
      nombreComercial: "TechSoluciones",
      dirMatriz: "Av. Naciones Unidas E10-44 y Shyris, Quito",
      estab: "001",
      ptoEmi: "001",
      ambiente: "PRUEBAS",
      tipoEmision: "NORMAL",
      obligadoContab: true,
      secuencialInicio: 1,
    },
  });
  console.log(`  ✅ ${tech.razonSocial}`);

  const [techMatriz, techNorte, techSur] = await Promise.all([
    prisma.branch.upsert({
      where:  { id: "tech-branch-matriz" },
      update: {},
      create: { id: "tech-branch-matriz", companyId: tech.id, nombre: "Matriz",         direccion: "Av. Naciones Unidas E10-44 y Shyris, Quito" },
    }),
    prisma.branch.upsert({
      where:  { id: "tech-branch-norte" },
      update: {},
      create: { id: "tech-branch-norte", companyId: tech.id, nombre: "Sucursal Norte", direccion: "Av. De los Shyris N36-189 y Suecia, Quito" },
    }),
    prisma.branch.upsert({
      where:  { id: "tech-branch-sur" },
      update: {},
      create: { id: "tech-branch-sur", companyId: tech.id, nombre: "Sucursal Sur",   direccion: "Av. Rodrigo de Chávez y Alonso de Angulo, Quito" },
    }),
  ]);
  console.log(`  ✅ 3 sucursales`);

  const [pw1, pw2, pw3, pw4] = await hashAll(["admin123", "norte123", "sur123", "emp123"]);
  const [techAdmin, , techEmpSur] = await Promise.all([
    prisma.user.upsert({ where: { email: "admin@techsoluciones.com" },  update: {}, create: { email: "admin@techsoluciones.com",  name: "Carlos Mendoza", password: pw1, role: "ADMIN",    companyId: tech.id, branchId: techMatriz.id } }),
    prisma.user.upsert({ where: { email: "norte@techsoluciones.com" },  update: {}, create: { email: "norte@techsoluciones.com",  name: "Andrea Viteri",  password: pw2, role: "EMPLOYED", companyId: tech.id, branchId: techNorte.id  } }),
    prisma.user.upsert({ where: { email: "sur@techsoluciones.com" },    update: {}, create: { email: "sur@techsoluciones.com",    name: "Roberto Salazar",password: pw3, role: "EMPLOYED", companyId: tech.id, branchId: techSur.id    } }),
    prisma.user.upsert({ where: { email: "matriz@techsoluciones.com" }, update: {}, create: { email: "matriz@techsoluciones.com", name: "Lucía Paredes",  password: pw4, role: "EMPLOYED", companyId: tech.id, branchId: techMatriz.id } }),
  ]);
  console.log(`  ✅ 4 usuarios`);

  const techClientData = [
    { tipoIdentif: "RUC"             as const, identificacion: "0990012345001", razonSocial: "COMERCIAL EL GRAN ALMACÉN CIA. LTDA.", email: "compras@granalm.com",   telefono: "0998765432", direccion: "Av. Amazonas 456, Quito"             },
    { tipoIdentif: "RUC"             as const, identificacion: "1791856230001", razonSocial: "DISTRIBUIDORA TECNOMUNDO S.A.",        email: "tecnomundo@gmail.com",   telefono: "0995551234", direccion: "Calle Versalles 432, Quito"           },
    { tipoIdentif: "CEDULA"          as const, identificacion: "1710234567",    razonSocial: "Juan Carlos Pérez Mora",               email: "juan.perez@gmail.com",   telefono: "0991234567", direccion: "Calle Ladrón de Guevara E11-45, Quito" },
    { tipoIdentif: "CEDULA"          as const, identificacion: "0201456789",    razonSocial: "María Fernanda Torres",                email: "mftorres@hotmail.com",   telefono: "0987001234", direccion: "Av. 6 de Diciembre N52-80, Quito"      },
    { tipoIdentif: "PASAPORTE"       as const, identificacion: "P12345678",     razonSocial: "John Smith",                          email: "jsmith@company.com",     telefono: "0987654321", direccion: "Hotel Marriott, Quito"                 },
    { tipoIdentif: "CONSUMIDOR_FINAL"as const, identificacion: "9999999999999", razonSocial: "CONSUMIDOR FINAL",                    email: null,                     telefono: null,         direccion: null                                    },
  ];
  for (const c of techClientData) {
    await prisma.client.upsert({ where: { companyId_identificacion: { companyId: tech.id, identificacion: c.identificacion } }, update: {}, create: { companyId: tech.id, ...c } });
  }

  const techProductData = [
    { codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)",  precio: 75.00,  tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: true  },
    { codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)",   precio: 50.00,  tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: true  },
    { codigoPrincipal: "SERV003", descripcion: "Soporte Técnico (hora)",          precio: 35.00,  tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: false },
    { codigoPrincipal: "SERV004", descripcion: "Capacitación Empresarial (día)",  precio: 350.00, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: false },
    { codigoPrincipal: "BIEN001", descripcion: "Laptop HP ProBook 450 G9",        precio: 899.99, tipoIva: "IVA_STANDARD" as const, tipo: "BIEN"    as const, isFavorite: false },
    { codigoPrincipal: "BIEN002", descripcion: "Mouse Inalámbrico Logitech MX",   precio: 45.00,  tipoIva: "IVA_STANDARD" as const, tipo: "BIEN"    as const, isFavorite: false },
    { codigoPrincipal: "BIEN003", descripcion: "Disco Duro Externo 1TB",          precio: 65.00,  tipoIva: "IVA_STANDARD" as const, tipo: "BIEN"    as const, isFavorite: false },
    { codigoPrincipal: "BIEN004", descripcion: "Teclado Mecánico Redragon",       precio: 89.00,  tipoIva: "IVA_STANDARD" as const, tipo: "BIEN"    as const, isFavorite: false },
    { codigoPrincipal: "LIC001",  descripcion: "Licencia Microsoft 365 (anual)",  precio: 120.00, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: true  },
  ];
  for (const p of techProductData) {
    await prisma.product.upsert({ where: { companyId_codigoPrincipal: { companyId: tech.id, codigoPrincipal: p.codigoPrincipal } }, update: {}, create: { companyId: tech.id, ...p } });
  }
  console.log(`  ✅ ${techClientData.length} clientes, ${techProductData.length} productos`);

  // ══════════════════════════════════════════════════════════════════════════
  // EMPRESA 2 — Alimentos del Valle (2 sucursales)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Empresa 2: Alimentos del Valle Cía. Ltda. ───────────────");

  const alimentos = await prisma.company.upsert({
    where: { ruc: "0190456780001" },
    update: {},
    create: {
      ruc: "0190456780001", razonSocial: "ALIMENTOS DEL VALLE CIA. LTDA.", nombreComercial: "Valle Foods",
      dirMatriz: "Av. Max Uhle y Av. Gil Ramírez Dávalos, Cuenca", estab: "001", ptoEmi: "001",
      ambiente: "PRUEBAS", tipoEmision: "NORMAL", obligadoContab: false, secuencialInicio: 1,
    },
  });
  console.log(`  ✅ ${alimentos.razonSocial}`);

  const [alimentosMatriz, alimentosGye] = await Promise.all([
    prisma.branch.upsert({ where: { id: "ali-branch-cuenca"    }, update: {}, create: { id: "ali-branch-cuenca",    companyId: alimentos.id, nombre: "Cuenca — Matriz", direccion: "Av. Max Uhle y Av. Gil Ramírez Dávalos, Cuenca" } }),
    prisma.branch.upsert({ where: { id: "ali-branch-guayaquil" }, update: {}, create: { id: "ali-branch-guayaquil", companyId: alimentos.id, nombre: "Guayaquil",        direccion: "Av. Francisco de Orellana, Guayaquil"           } }),
  ]);

  const [pw5, pw6, pw7] = await hashAll(["gerente123", "cuenca123", "gye123"]);
  const [alimentosAdmin] = await Promise.all([
    prisma.user.upsert({ where: { email: "gerente@vallefoods.com"    }, update: {}, create: { email: "gerente@vallefoods.com",    name: "Patricia Álvarez", password: pw5, role: "ADMIN",    companyId: alimentos.id, branchId: alimentosMatriz.id } }),
    prisma.user.upsert({ where: { email: "cuenca@vallefoods.com"     }, update: {}, create: { email: "cuenca@vallefoods.com",     name: "Diego Cárdenas",   password: pw6, role: "EMPLOYED", companyId: alimentos.id, branchId: alimentosMatriz.id } }),
    prisma.user.upsert({ where: { email: "guayaquil@vallefoods.com"  }, update: {}, create: { email: "guayaquil@vallefoods.com",  name: "Sofía Reyes",      password: pw7, role: "EMPLOYED", companyId: alimentos.id, branchId: alimentosGye.id    } }),
  ]);

  const alimentosClientData = [
    { tipoIdentif: "RUC"             as const, identificacion: "0190123456001", razonSocial: "SUPERMERCADO CORAL S.A.",  email: "compras@coral.com",   telefono: "0994321000", direccion: "Av. Solano 12, Cuenca"         },
    { tipoIdentif: "RUC"             as const, identificacion: "0990876543001", razonSocial: "MEGAMAXI S.A.",            email: null,                  telefono: null,         direccion: "Av. Las Monjas, Guayaquil"     },
    { tipoIdentif: "CEDULA"          as const, identificacion: "0105678901",    razonSocial: "Jorge Iván Quinde",        email: "jorge@gmail.com",     telefono: "0985559988", direccion: "Calle Larga 3-45, Cuenca"      },
    { tipoIdentif: "CONSUMIDOR_FINAL"as const, identificacion: "9999999999999", razonSocial: "CONSUMIDOR FINAL",         email: null,                  telefono: null,         direccion: null                            },
  ];
  for (const c of alimentosClientData) {
    await prisma.client.upsert({ where: { companyId_identificacion: { companyId: alimentos.id, identificacion: c.identificacion } }, update: {}, create: { companyId: alimentos.id, ...c } });
  }

  const alimentosProductData = [
    { codigoPrincipal: "ARR001", descripcion: "Arroz Superior 25kg",          precio: 18.50, tipoIva: "IVA_0"        as const, tipo: "BIEN" as const, isFavorite: true  },
    { codigoPrincipal: "AZU001", descripcion: "Azúcar Morena 50kg",           precio: 28.00, tipoIva: "IVA_0"        as const, tipo: "BIEN" as const, isFavorite: true  },
    { codigoPrincipal: "ACE001", descripcion: "Aceite de Girasol 1L",         precio: 2.80,  tipoIva: "IVA_0"        as const, tipo: "BIEN" as const, isFavorite: false },
    { codigoPrincipal: "HAR001", descripcion: "Harina de Trigo 50kg",         precio: 21.00, tipoIva: "IVA_0"        as const, tipo: "BIEN" as const, isFavorite: false },
    { codigoPrincipal: "SAL001", descripcion: "Sal Yodada 1kg",               precio: 0.45,  tipoIva: "IVA_0"        as const, tipo: "BIEN" as const, isFavorite: false },
    { codigoPrincipal: "BEB001", descripcion: "Agua Purificada 20L (bidón)",  precio: 3.50,  tipoIva: "IVA_STANDARD" as const, tipo: "BIEN" as const, isFavorite: false },
    { codigoPrincipal: "COND01", descripcion: "Condimentos Pack x12",         precio: 15.60, tipoIva: "IVA_STANDARD" as const, tipo: "BIEN" as const, isFavorite: false },
  ];
  for (const p of alimentosProductData) {
    await prisma.product.upsert({ where: { companyId_codigoPrincipal: { companyId: alimentos.id, codigoPrincipal: p.codigoPrincipal } }, update: {}, create: { companyId: alimentos.id, ...p } });
  }
  console.log(`  ✅ ${alimentosClientData.length} clientes, ${alimentosProductData.length} productos`);

  // ══════════════════════════════════════════════════════════════════════════
  // EMPRESA 3 — Mora & Asociados (1 sucursal)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Empresa 3: Estudio Jurídico Mora & Asociados ────────────");

  const juridica = await prisma.company.upsert({
    where: { ruc: "1704567890001" },
    update: {},
    create: {
      ruc: "1704567890001", razonSocial: "ESTUDIO JURÍDICO MORA & ASOCIADOS", nombreComercial: "Mora Abogados",
      dirMatriz: "Av. Colón E4-60 y 9 de Octubre, Quito", estab: "001", ptoEmi: "001",
      ambiente: "PRUEBAS", tipoEmision: "NORMAL", obligadoContab: false, secuencialInicio: 1,
    },
  });
  console.log(`  ✅ ${juridica.razonSocial}`);

  const juridicaMatriz = await prisma.branch.upsert({ where: { id: "jur-branch-matriz" }, update: {}, create: { id: "jur-branch-matriz", companyId: juridica.id, nombre: "Oficina Principal", direccion: "Av. Colón E4-60 y 9 de Octubre, Quito" } });
  const [pw8, pw9] = await hashAll(["mora123", "asist123"]);
  const [juridicaAdmin] = await Promise.all([
    prisma.user.upsert({ where: { email: "dr.mora@moraabogados.com"    }, update: {}, create: { email: "dr.mora@moraabogados.com",    name: "Dr. Rodrigo Mora", password: pw8, role: "ADMIN",    companyId: juridica.id, branchId: juridicaMatriz.id } }),
    prisma.user.upsert({ where: { email: "asistente@moraabogados.com"  }, update: {}, create: { email: "asistente@moraabogados.com",  name: "Valeria Castro",   password: pw9, role: "EMPLOYED", companyId: juridica.id, branchId: juridicaMatriz.id } }),
  ]);

  const juridicaClientData = [
    { tipoIdentif: "RUC"             as const, identificacion: "1791234567001", razonSocial: "IMPORTADORA GLOBAL S.A.",  email: "legal@importadora.com", telefono: "0992345678", direccion: "Av. Eloy Alfaro N32-450, Quito" },
    { tipoIdentif: "CEDULA"          as const, identificacion: "1723456789",    razonSocial: "Daniela Suárez Ponce",     email: "dsuarez@gmail.com",     telefono: "0981234567", direccion: "Los Eucaliptos 234, Cumbayá"    },
    { tipoIdentif: "CONSUMIDOR_FINAL"as const, identificacion: "9999999999999", razonSocial: "CONSUMIDOR FINAL",         email: null,                    telefono: null,         direccion: null                            },
  ];
  for (const c of juridicaClientData) {
    await prisma.client.upsert({ where: { companyId_identificacion: { companyId: juridica.id, identificacion: c.identificacion } }, update: {}, create: { companyId: juridica.id, ...c } });
  }

  const juridicaProductData = [
    { codigoPrincipal: "HON001", descripcion: "Honorarios por Consulta Legal (hora)", precio: 120.0, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: true  },
    { codigoPrincipal: "HON002", descripcion: "Patrocinio en Juicio Civil",           precio: 800.0, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: false },
    { codigoPrincipal: "HON003", descripcion: "Redacción de Contratos",               precio: 250.0, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: true  },
    { codigoPrincipal: "HON004", descripcion: "Trámite de Escritura Pública",         precio: 180.0, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: false },
  ];
  for (const p of juridicaProductData) {
    await prisma.product.upsert({ where: { companyId_codigoPrincipal: { companyId: juridica.id, codigoPrincipal: p.codigoPrincipal } }, update: {}, create: { companyId: juridica.id, ...p } });
  }
  console.log(`  ✅ ${juridicaClientData.length} clientes, ${juridicaProductData.length} productos`);

  // ══════════════════════════════════════════════════════════════════════════
  // PROVEEDORES
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Proveedores ─────────────────────────────────────────────");

  const [suppTechHP, suppTechMS, suppTechDist] = await Promise.all([
    prisma.supplier.upsert({ where: { id: "supp-tech-hp"   }, update: {}, create: { id: "supp-tech-hp",   companyId: tech.id, ruc: "0990123456001", nombre: "Distribuidora HP Ecuador S.A.", email: "ventas@hp-ec.com",  telefono: "022451234", direccion: "Av. Amazonas N39-123, Quito"    } }),
    prisma.supplier.upsert({ where: { id: "supp-tech-ms"   }, update: {}, create: { id: "supp-tech-ms",   companyId: tech.id, ruc: "1791456789001", nombre: "Microsoft Ecuador Cía. Ltda.",  email: "partners@msec.com",telefono: "022456789", direccion: "World Trade Center, Quito"       } }),
    prisma.supplier.upsert({ where: { id: "supp-tech-dist" }, update: {}, create: { id: "supp-tech-dist", companyId: tech.id, ruc: "1790987654001", nombre: "TechImport S.A.",               email: "pedidos@teci.com", telefono: "022345678", direccion: "Av. 10 de Agosto N25-75, Quito" } }),
  ]);

  await Promise.all([
    prisma.supplier.upsert({ where: { id: "supp-ali-agro"  }, update: {}, create: { id: "supp-ali-agro",  companyId: alimentos.id, ruc: "0190567890001", nombre: "Agroindustrial del Sur S.A.", email: "ventas@agrosur.com",  telefono: "072890123", direccion: "Vía Duran-Tambo, Cuenca"    } }),
    prisma.supplier.upsert({ where: { id: "supp-ali-dist"  }, update: {}, create: { id: "supp-ali-dist",  companyId: alimentos.id, ruc: "0990345678001", nombre: "Distribuidora Andina CIA.",   email: "pedidos@dandina.com",telefono: "074561234", direccion: "Av. De las Américas, Guayaquil" } }),
  ]);

  await prisma.supplier.upsert({ where: { id: "supp-jur-imp" }, update: {}, create: { id: "supp-jur-imp", companyId: juridica.id, ruc: "1790234567001", nombre: "Papelería Judicial Express", email: null, telefono: "022123456", direccion: "Calle Bolívar 340, Quito" } });

  console.log("  ✅ 6 proveedores (3 Tech, 2 Alimentos, 1 Mora)");

  // ══════════════════════════════════════════════════════════════════════════
  // INVENTARIO — TechSoluciones
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Inventario: TechSoluciones ──────────────────────────────");

  // Recuperar productos físicos de TechSoluciones
  const techBienes = await prisma.product.findMany({
    where: { companyId: tech.id, codigoPrincipal: { in: ["BIEN001","BIEN002","BIEN003","BIEN004"] } },
    select: { id: true, codigoPrincipal: true },
  });
  const techBienMap = Object.fromEntries(techBienes.map((p) => [p.codigoPrincipal, p.id]));

  // Configuración de inventario por producto
  const invConfigs = [
    { productId: techBienMap["BIEN001"], costoPromedio: 720.00, stockMinimo: 10, label: "Laptop"   },
    { productId: techBienMap["BIEN002"], costoPromedio:  30.00, stockMinimo:  5, label: "Mouse"    },
    { productId: techBienMap["BIEN003"], costoPromedio:  50.00, stockMinimo:  5, label: "Disco"    },
    { productId: techBienMap["BIEN004"], costoPromedio:  65.00, stockMinimo:  8, label: "Teclado"  },
  ];

  const techInvProdMap: Record<string, string> = {};

  for (const cfg of invConfigs) {
    const ip = await prisma.inventoryProduct.upsert({
      where:  { productId: cfg.productId },
      update: {},
      create: { productId: cfg.productId, companyId: tech.id, tracksInventory: true, costoPromedio: cfg.costoPromedio, stockMinimo: cfg.stockMinimo },
    });
    techInvProdMap[cfg.productId] = ip.id;
  }

  // Stock por sucursal — algunos bajo mínimo para activar alertas
  // Matriz:  Laptop=3 (min=10) ALERTA, Mouse=25, Disco=15, Teclado=5 (min=8) ALERTA
  // Norte:   Laptop=2 (min=10) ALERTA, Mouse=18, Disco=8,  Teclado=12
  // Sur:     Laptop=4 (min=10) ALERTA, Mouse=12, Disco=6,  Teclado=3 (min=8) ALERTA
  const stockPlan: Array<{ branchId: string; codigoPrincipal: string; cantidad: number; stockMinimo: number }> = [
    { branchId: techMatriz.id, codigoPrincipal: "BIEN001", cantidad:  3, stockMinimo: 10 },
    { branchId: techMatriz.id, codigoPrincipal: "BIEN002", cantidad: 25, stockMinimo:  5 },
    { branchId: techMatriz.id, codigoPrincipal: "BIEN003", cantidad: 15, stockMinimo:  5 },
    { branchId: techMatriz.id, codigoPrincipal: "BIEN004", cantidad:  5, stockMinimo:  8 },
    { branchId: techNorte.id,  codigoPrincipal: "BIEN001", cantidad:  2, stockMinimo: 10 },
    { branchId: techNorte.id,  codigoPrincipal: "BIEN002", cantidad: 18, stockMinimo:  5 },
    { branchId: techNorte.id,  codigoPrincipal: "BIEN003", cantidad:  8, stockMinimo:  5 },
    { branchId: techNorte.id,  codigoPrincipal: "BIEN004", cantidad: 12, stockMinimo:  8 },
    { branchId: techSur.id,    codigoPrincipal: "BIEN001", cantidad:  4, stockMinimo: 10 },
    { branchId: techSur.id,    codigoPrincipal: "BIEN002", cantidad: 12, stockMinimo:  5 },
    { branchId: techSur.id,    codigoPrincipal: "BIEN003", cantidad:  6, stockMinimo:  5 },
    { branchId: techSur.id,    codigoPrincipal: "BIEN004", cantidad:  3, stockMinimo:  8 },
  ];

  for (const s of stockPlan) {
    const productId = techBienMap[s.codigoPrincipal];
    const invProdId = techInvProdMap[productId];
    await prisma.stock.upsert({
      where:  { branchId_inventoryProductId: { branchId: s.branchId, inventoryProductId: invProdId } },
      update: { cantidad: s.cantidad, stockMinimo: s.stockMinimo },
      create: { companyId: tech.id, branchId: s.branchId, inventoryProductId: invProdId, cantidad: s.cantidad, stockMinimo: s.stockMinimo },
    });
  }
  // Alertas esperadas: BIEN001 × 3 sucursales + BIEN004 × 2 sucursales = 5 alertas
  console.log("  ✅ 4 productos con inventario, 12 registros de stock (5 alertas activas)");

  // ══════════════════════════════════════════════════════════════════════════
  // INVENTARIO — Alimentos del Valle
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Inventario: Alimentos del Valle ─────────────────────────");

  const aliProds = await prisma.product.findMany({
    where: { companyId: alimentos.id, codigoPrincipal: { in: ["ARR001","AZU001","ACE001","HAR001","SAL001"] } },
    select: { id: true, codigoPrincipal: true },
  });
  const aliProdMap = Object.fromEntries(aliProds.map((p) => [p.codigoPrincipal, p.id]));

  const aliInvConfigs = [
    { codigoPrincipal: "ARR001", costoPromedio: 15.00, stockMinimo: 20 },
    { codigoPrincipal: "AZU001", costoPromedio: 22.00, stockMinimo: 30 },
    { codigoPrincipal: "ACE001", costoPromedio:  2.10, stockMinimo: 50 },
    { codigoPrincipal: "HAR001", costoPromedio: 16.00, stockMinimo: 15 },
    { codigoPrincipal: "SAL001", costoPromedio:  0.30, stockMinimo: 100 },
  ];
  const aliInvProdMap: Record<string, string> = {};
  for (const cfg of aliInvConfigs) {
    const productId = aliProdMap[cfg.codigoPrincipal];
    const ip = await prisma.inventoryProduct.upsert({
      where:  { productId },
      update: {},
      create: { productId, companyId: alimentos.id, tracksInventory: true, costoPromedio: cfg.costoPromedio, stockMinimo: cfg.stockMinimo },
    });
    aliInvProdMap[productId] = ip.id;
  }

  // Cuenca: AZU=25 (min=30) ALERTA; Gye: AZU=15 (min=30) ALERTA, HAR=10 (min=15) ALERTA
  const aliStockPlan = [
    { branchId: alimentosMatriz.id, codigoPrincipal: "ARR001", cantidad:  50, stockMinimo: 20 },
    { branchId: alimentosMatriz.id, codigoPrincipal: "AZU001", cantidad:  25, stockMinimo: 30 },
    { branchId: alimentosMatriz.id, codigoPrincipal: "ACE001", cantidad: 200, stockMinimo: 50 },
    { branchId: alimentosMatriz.id, codigoPrincipal: "HAR001", cantidad:  30, stockMinimo: 15 },
    { branchId: alimentosMatriz.id, codigoPrincipal: "SAL001", cantidad: 500, stockMinimo: 100 },
    { branchId: alimentosGye.id,    codigoPrincipal: "ARR001", cantidad:  32, stockMinimo: 20 },
    { branchId: alimentosGye.id,    codigoPrincipal: "AZU001", cantidad:  15, stockMinimo: 30 },
    { branchId: alimentosGye.id,    codigoPrincipal: "ACE001", cantidad: 120, stockMinimo: 50 },
    { branchId: alimentosGye.id,    codigoPrincipal: "HAR001", cantidad:  10, stockMinimo: 15 },
    { branchId: alimentosGye.id,    codigoPrincipal: "SAL001", cantidad: 280, stockMinimo: 100 },
  ];
  for (const s of aliStockPlan) {
    const productId = aliProdMap[s.codigoPrincipal];
    const invProdId = aliInvProdMap[productId];
    await prisma.stock.upsert({
      where:  { branchId_inventoryProductId: { branchId: s.branchId, inventoryProductId: invProdId } },
      update: { cantidad: s.cantidad, stockMinimo: s.stockMinimo },
      create: { companyId: alimentos.id, branchId: s.branchId, inventoryProductId: invProdId, cantidad: s.cantidad, stockMinimo: s.stockMinimo },
    });
  }
  console.log("  ✅ 5 productos con inventario, 10 registros de stock (3 alertas activas)");

  // ══════════════════════════════════════════════════════════════════════════
  // TRANSFERENCIA DE STOCK — TechSoluciones (Norte → Sur)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Transferencias de stock ──────────────────────────────────");

  const existingTransfer = await prisma.stockTransfer.findFirst({ where: { companyId: tech.id } });
  if (!existingTransfer) {
    const laptopInvId  = techInvProdMap[techBienMap["BIEN001"]];
    const mouseInvId   = techInvProdMap[techBienMap["BIEN002"]];
    await prisma.stockTransfer.create({
      data: {
        companyId:    tech.id,
        fromBranchId: techNorte.id,
        toBranchId:   techSur.id,
        userId:       techEmpSur.id,
        status:       "COMPLETADA",
        notas:        "Reposición mensual Sucursal Sur",
        items: {
          create: [
            { inventoryProductId: laptopInvId, cantidad: 2, costoUnitario: 720.00 },
            { inventoryProductId: mouseInvId,  cantidad: 5, costoUnitario:  30.00 },
          ],
        },
      },
    });
    console.log("  ✅ 1 transferencia Norte → Sur (Laptop x2, Mouse x5)");
  } else {
    console.log("  ⏭  Transferencia ya existe, omitida");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPRAS — TechSoluciones
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Compras: TechSoluciones ──────────────────────────────────");

  const existingTechPurchases = await prisma.purchase.count({ where: { companyId: tech.id } });

  if (existingTechPurchases === 0) {
    const techPurchases = [
      // Marzo 2026
      {
        supplierId: suppTechHP.id, branchId: techMatriz.id, fechaCompra: ecuDate("2026-03-08"),
        tipoDocumento: "FACTURA" as const, numeroDocumento: "001-001-000045231",
        items: [
          { productId: techBienMap["BIEN001"], descripcion: "Laptop HP ProBook 450 G9", cantidad: 10, costoUnitario: 720.00 },
          { productId: techBienMap["BIEN002"], descripcion: "Mouse Inalámbrico Logitech MX", cantidad: 30, costoUnitario: 30.00 },
        ],
      },
      {
        supplierId: suppTechDist.id, branchId: techNorte.id, fechaCompra: ecuDate("2026-03-22"),
        tipoDocumento: "FACTURA" as const, numeroDocumento: "002-001-000012345",
        items: [
          { productId: techBienMap["BIEN003"], descripcion: "Disco Duro Externo 1TB", cantidad: 20, costoUnitario: 50.00 },
          { productId: techBienMap["BIEN004"], descripcion: "Teclado Mecánico Redragon", cantidad: 25, costoUnitario: 65.00 },
        ],
      },
      // Abril 2026
      {
        supplierId: suppTechMS.id, branchId: techMatriz.id, fechaCompra: ecuDate("2026-04-03"),
        tipoDocumento: "FACTURA" as const, numeroDocumento: "003-001-000009876",
        notas: "Renovación de licencias corporativas Q2-2026",
        items: [
          { descripcion: "Licencias Microsoft 365 Business (x20)", cantidad: 20, costoUnitario: 95.00 },
        ],
      },
      {
        supplierId: suppTechHP.id, branchId: techMatriz.id, fechaCompra: ecuDate("2026-04-10"),
        tipoDocumento: "FACTURA" as const, numeroDocumento: "001-001-000046890",
        items: [
          { productId: techBienMap["BIEN001"], descripcion: "Laptop HP ProBook 450 G9", cantidad: 5, costoUnitario: 720.00 },
          { productId: techBienMap["BIEN004"], descripcion: "Teclado Mecánico Redragon", cantidad: 20, costoUnitario: 65.00 },
        ],
      },
      {
        supplierId: suppTechDist.id, branchId: techNorte.id, fechaCompra: ecuDate("2026-04-18"),
        tipoDocumento: "NOTA_ENTREGA" as const, numeroDocumento: "NE-2026-0089",
        items: [
          { productId: techBienMap["BIEN002"], descripcion: "Mouse Inalámbrico Logitech MX", cantidad: 40, costoUnitario: 30.00 },
          { productId: techBienMap["BIEN003"], descripcion: "Disco Duro Externo 1TB", cantidad: 25, costoUnitario: 50.00 },
        ],
      },
    ];

    for (const p of techPurchases) {
      let subtotal = 0;
      for (const it of p.items) subtotal += it.cantidad * it.costoUnitario;
      await prisma.purchase.create({
        data: {
          companyId:       tech.id,
          supplierId:      p.supplierId,
          branchId:        p.branchId,
          userId:          techAdmin.id,
          tipoDocumento:   p.tipoDocumento,
          numeroDocumento: p.numeroDocumento ?? null,
          fechaCompra:     p.fechaCompra,
          notas:           (p as { notas?: string }).notas ?? null,
          subtotal,
          iva:    0,
          total:  subtotal,
          items: { create: p.items.map((it) => ({ productId: (it as { productId?: string }).productId ?? null, descripcion: it.descripcion, cantidad: it.cantidad, costoUnitario: it.costoUnitario, costoTotal: it.cantidad * it.costoUnitario })) },
        },
      });
    }
    console.log(`  ✅ ${techPurchases.length} órdenes de compra (2 marzo + 3 abril)`);
  } else {
    console.log("  ⏭  Compras de TechSoluciones ya existen, omitidas");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPRAS — Alimentos del Valle
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Compras: Alimentos del Valle ─────────────────────────────");

  const existingAliPurchases = await prisma.purchase.count({ where: { companyId: alimentos.id } });
  if (existingAliPurchases === 0) {
    const suppAliAgro  = await prisma.supplier.findUnique({ where: { id: "supp-ali-agro" } });
    const suppAliDist  = await prisma.supplier.findUnique({ where: { id: "supp-ali-dist" } });
    const aliPurchases = [
      { supplierId: suppAliAgro!.id, branchId: alimentosMatriz.id, fechaCompra: ecuDate("2026-03-15"), items: [{ productId: aliProdMap["ARR001"], descripcion: "Arroz Superior 25kg", cantidad: 100, costoUnitario: 15.00 }, { productId: aliProdMap["AZU001"], descripcion: "Azúcar Morena 50kg", cantidad: 60, costoUnitario: 22.00 }] },
      { supplierId: suppAliDist!.id, branchId: alimentosGye.id,    fechaCompra: ecuDate("2026-04-05"), items: [{ productId: aliProdMap["ACE001"], descripcion: "Aceite de Girasol 1L", cantidad: 300, costoUnitario: 2.10 }, { productId: aliProdMap["SAL001"], descripcion: "Sal Yodada 1kg", cantidad: 500, costoUnitario: 0.30 }] },
      { supplierId: suppAliAgro!.id, branchId: alimentosMatriz.id, fechaCompra: ecuDate("2026-04-12"), items: [{ productId: aliProdMap["HAR001"], descripcion: "Harina de Trigo 50kg", cantidad: 40, costoUnitario: 16.00 }, { productId: aliProdMap["ARR001"], descripcion: "Arroz Superior 25kg", cantidad: 80, costoUnitario: 15.00 }] },
      { supplierId: suppAliDist!.id, branchId: alimentosGye.id,    fechaCompra: ecuDate("2026-04-20"), items: [{ productId: aliProdMap["AZU001"], descripcion: "Azúcar Morena 50kg", cantidad: 50, costoUnitario: 22.00 }] },
    ];
    for (const p of aliPurchases) {
      let subtotal = 0;
      for (const it of p.items) subtotal += it.cantidad * it.costoUnitario;
      await prisma.purchase.create({
        data: {
          companyId: alimentos.id, supplierId: p.supplierId, branchId: p.branchId,
          userId: alimentosAdmin.id, fechaCompra: p.fechaCompra, subtotal, iva: 0, total: subtotal,
          items: { create: p.items.map((it) => ({ productId: it.productId ?? null, descripcion: it.descripcion, cantidad: it.cantidad, costoUnitario: it.costoUnitario, costoTotal: it.cantidad * it.costoUnitario })) },
        },
      });
    }
    console.log(`  ✅ ${aliPurchases.length} órdenes de compra`);
  } else {
    console.log("  ⏭  Compras de Alimentos ya existen, omitidas");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FACTURAS — TechSoluciones
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Facturas: TechSoluciones ─────────────────────────────────");

  const existingTechInvoices = await prisma.invoice.count({ where: { companyId: tech.id } });

  if (existingTechInvoices === 0) {
    // Recuperar clientes
    const tc = await prisma.client.findMany({
      where: { companyId: tech.id },
      select: { id: true, identificacion: true },
    });
    const tcMap = Object.fromEntries(tc.map((c) => [c.identificacion, c.id]));
    const gran  = tcMap["0990012345001"];
    const tecno = tcMap["1791856230001"];
    const juan  = tcMap["1710234567"];
    const maria = tcMap["0201456789"];
    const john  = tcMap["P12345678"];
    const cf    = tcMap["9999999999999"];

    interface InvoiceDef {
      secuencial: number;
      clientId:   string;
      fecha:      Date;
      estado:     "AUTORIZADO" | "PENDIENTE" | "RECHAZADO" | "ANULADO" | "DEVUELTA";
      lines:      LineItem[];
    }

    const TODAY = "2026-04-25";

    const invoices: InvoiceDef[] = [
      // ── Enero 2026 ────────────────────────────────────────────────────────
      { secuencial: 1,  clientId: gran,  fecha: ecuDate("2026-01-08"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 8,  precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 2,  clientId: tecno, fecha: ecuDate("2026-01-12"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "BIEN001", descripcion: "Laptop HP ProBook 450 G9",      cantidad: 1,  precioUnitario: 899.99,tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "BIEN002", descripcion: "Mouse Inalámbrico Logitech MX", cantidad: 2, precioUnitario: 45.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 3,  clientId: juan,  fecha: ecuDate("2026-01-18"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "LIC001",  descripcion: "Licencia Microsoft 365 (anual)",cantidad: 1,  precioUnitario: 120.00,tipoIva: "IVA_STANDARD" }] },
      { secuencial: 4,  clientId: gran,  fecha: ecuDate("2026-01-22"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 16, precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "LIC001", descripcion: "Licencia Microsoft 365 (anual)", cantidad: 2, precioUnitario: 120.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 5,  clientId: maria, fecha: ecuDate("2026-01-27"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV003", descripcion: "Soporte Técnico (hora)",         cantidad: 5,  precioUnitario: 35.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 6,  clientId: john,  fecha: ecuDate("2026-01-30"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)", cantidad: 4,  precioUnitario: 75.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "LIC001", descripcion: "Licencia Microsoft 365 (anual)", cantidad: 1, precioUnitario: 120.00, tipoIva: "IVA_STANDARD" }] },

      // ── Febrero 2026 ──────────────────────────────────────────────────────
      { secuencial: 7,  clientId: gran,  fecha: ecuDate("2026-02-04"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)", cantidad: 8,  precioUnitario: 75.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 8,  clientId: tecno, fecha: ecuDate("2026-02-07"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "BIEN001", descripcion: "Laptop HP ProBook 450 G9",      cantidad: 2,  precioUnitario: 899.99,tipoIva: "IVA_STANDARD" }] },
      { secuencial: 9,  clientId: cf,    fecha: ecuDate("2026-02-11"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV003", descripcion: "Soporte Técnico (hora)",         cantidad: 10, precioUnitario: 35.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 10, clientId: juan,  fecha: ecuDate("2026-02-14"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 8,  precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "LIC001", descripcion: "Licencia Microsoft 365 (anual)", cantidad: 1, precioUnitario: 120.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 11, clientId: maria, fecha: ecuDate("2026-02-18"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV004", descripcion: "Capacitación Empresarial (día)", cantidad: 1,  precioUnitario: 350.00,tipoIva: "IVA_STANDARD" }] },
      { secuencial: 12, clientId: gran,  fecha: ecuDate("2026-02-21"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "BIEN002", descripcion: "Mouse Inalámbrico Logitech MX", cantidad: 4,  precioUnitario: 45.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "BIEN004", descripcion: "Teclado Mecánico Redragon", cantidad: 2, precioUnitario: 89.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 13, clientId: tecno, fecha: ecuDate("2026-02-25"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 16, precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "LIC001", descripcion: "Licencia Microsoft 365 (anual)", cantidad: 2, precioUnitario: 120.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 14, clientId: john,  fecha: ecuDate("2026-02-27"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)", cantidad: 8,  precioUnitario: 75.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 15, clientId: juan,  fecha: ecuDate("2026-02-28"), estado: "ANULADO",    lines: [{ codigoPrincipal: "BIEN001", descripcion: "Laptop HP ProBook 450 G9",      cantidad: 1,  precioUnitario: 899.99,tipoIva: "IVA_STANDARD" }] },

      // ── Marzo 2026 ────────────────────────────────────────────────────────
      { secuencial: 16, clientId: gran,  fecha: ecuDate("2026-03-05"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)", cantidad: 6,  precioUnitario: 75.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "SERV003", descripcion: "Soporte Técnico (hora)", cantidad: 3, precioUnitario: 35.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 17, clientId: tecno, fecha: ecuDate("2026-03-08"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "BIEN003", descripcion: "Disco Duro Externo 1TB",        cantidad: 5,  precioUnitario: 65.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "BIEN004", descripcion: "Teclado Mecánico Redragon", cantidad: 3, precioUnitario: 89.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 18, clientId: juan,  fecha: ecuDate("2026-03-12"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 12, precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 19, clientId: gran,  fecha: ecuDate("2026-03-15"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV004", descripcion: "Capacitación Empresarial (día)", cantidad: 2,  precioUnitario: 350.00,tipoIva: "IVA_STANDARD" }] },
      { secuencial: 20, clientId: maria, fecha: ecuDate("2026-03-18"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "LIC001",  descripcion: "Licencia Microsoft 365 (anual)",cantidad: 3,  precioUnitario: 120.00,tipoIva: "IVA_STANDARD" }] },
      { secuencial: 21, clientId: tecno, fecha: ecuDate("2026-03-20"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "BIEN001", descripcion: "Laptop HP ProBook 450 G9",      cantidad: 3,  precioUnitario: 899.99,tipoIva: "IVA_STANDARD" }] },
      { secuencial: 22, clientId: cf,    fecha: ecuDate("2026-03-22"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV003", descripcion: "Soporte Técnico (hora)",         cantidad: 8,  precioUnitario: 35.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 23, clientId: gran,  fecha: ecuDate("2026-03-25"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 20, precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "LIC001", descripcion: "Licencia Microsoft 365 (anual)", cantidad: 2, precioUnitario: 120.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 24, clientId: john,  fecha: ecuDate("2026-03-27"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)", cantidad: 4,  precioUnitario: 75.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 25, clientId: juan,  fecha: ecuDate("2026-03-29"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "BIEN004", descripcion: "Teclado Mecánico Redragon",      cantidad: 4,  precioUnitario: 89.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "BIEN002", descripcion: "Mouse Inalámbrico Logitech MX", cantidad: 6, precioUnitario: 45.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 26, clientId: maria, fecha: ecuDate("2026-03-30"), estado: "RECHAZADO",  lines: [{ codigoPrincipal: "BIEN001", descripcion: "Laptop HP ProBook 450 G9",      cantidad: 1,  precioUnitario: 899.99,tipoIva: "IVA_STANDARD" }] },

      // ── Abril 2026 — primera quincena (AUTORIZADO) ─────────────────────
      { secuencial: 27, clientId: gran,  fecha: ecuDate("2026-04-02"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 16, precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 28, clientId: tecno, fecha: ecuDate("2026-04-04"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "BIEN001", descripcion: "Laptop HP ProBook 450 G9",      cantidad: 2,  precioUnitario: 899.99,tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "BIEN002", descripcion: "Mouse Inalámbrico Logitech MX", cantidad: 4, precioUnitario: 45.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 29, clientId: juan,  fecha: ecuDate("2026-04-06"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)", cantidad: 8,  precioUnitario: 75.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "LIC001", descripcion: "Licencia Microsoft 365 (anual)", cantidad: 1, precioUnitario: 120.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 30, clientId: gran,  fecha: ecuDate("2026-04-08"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV004", descripcion: "Capacitación Empresarial (día)", cantidad: 1,  precioUnitario: 350.00,tipoIva: "IVA_STANDARD" }] },
      { secuencial: 31, clientId: maria, fecha: ecuDate("2026-04-10"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 8,  precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 32, clientId: tecno, fecha: ecuDate("2026-04-12"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "BIEN003", descripcion: "Disco Duro Externo 1TB",        cantidad: 10, precioUnitario: 65.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 33, clientId: cf,    fecha: ecuDate("2026-04-13"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV003", descripcion: "Soporte Técnico (hora)",         cantidad: 5,  precioUnitario: 35.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 34, clientId: gran,  fecha: ecuDate("2026-04-15"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 24, precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 35, clientId: john,  fecha: ecuDate("2026-04-17"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)", cantidad: 8,  precioUnitario: 75.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "SERV004", descripcion: "Capacitación Empresarial (día)", cantidad: 1, precioUnitario: 350.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 36, clientId: juan,  fecha: ecuDate("2026-04-18"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "BIEN001", descripcion: "Laptop HP ProBook 450 G9",      cantidad: 1,  precioUnitario: 899.99,tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "BIEN004", descripcion: "Teclado Mecánico Redragon", cantidad: 1, precioUnitario: 89.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 37, clientId: tecno, fecha: ecuDate("2026-04-20"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "LIC001",  descripcion: "Licencia Microsoft 365 (anual)",cantidad: 5,  precioUnitario: 120.00,tipoIva: "IVA_STANDARD" }] },
      { secuencial: 38, clientId: gran,  fecha: ecuDate("2026-04-21"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 12, precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "LIC001", descripcion: "Licencia Microsoft 365 (anual)", cantidad: 3, precioUnitario: 120.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 39, clientId: maria, fecha: ecuDate("2026-04-22"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV003", descripcion: "Soporte Técnico (hora)",         cantidad: 8,  precioUnitario: 35.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 40, clientId: cf,    fecha: ecuDate("2026-04-23"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "BIEN002", descripcion: "Mouse Inalámbrico Logitech MX", cantidad: 10, precioUnitario: 45.00, tipoIva: "IVA_STANDARD" }, { codigoPrincipal: "BIEN004", descripcion: "Teclado Mecánico Redragon", cantidad: 5, precioUnitario: 89.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 41, clientId: gran,  fecha: ecuDate("2026-04-24"), estado: "AUTORIZADO", lines: [{ codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)", cantidad: 12, precioUnitario: 75.00, tipoIva: "IVA_STANDARD" }] },

      // ── Abril 25, 2026 — HOY (PENDIENTE) ──────────────────────────────
      { secuencial: 42, clientId: tecno, fecha: ecuDate(TODAY), estado: "PENDIENTE",  lines: [{ codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)", cantidad: 8,  precioUnitario: 50.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 43, clientId: juan,  fecha: ecuDate(TODAY), estado: "PENDIENTE",  lines: [{ codigoPrincipal: "BIEN001", descripcion: "Laptop HP ProBook 450 G9",      cantidad: 1,  precioUnitario: 899.99,tipoIva: "IVA_STANDARD" }] },
      { secuencial: 44, clientId: gran,  fecha: ecuDate(TODAY), estado: "PENDIENTE",  lines: [{ codigoPrincipal: "LIC001",  descripcion: "Licencia Microsoft 365 (anual)",cantidad: 10, precioUnitario: 120.00,tipoIva: "IVA_STANDARD" }] },
      { secuencial: 45, clientId: cf,    fecha: ecuDate(TODAY), estado: "PENDIENTE",  lines: [{ codigoPrincipal: "SERV003", descripcion: "Soporte Técnico (hora)",         cantidad: 4,  precioUnitario: 35.00, tipoIva: "IVA_STANDARD" }] },
      { secuencial: 46, clientId: maria, fecha: ecuDate(TODAY), estado: "DEVUELTA",   lines: [{ codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)", cantidad: 3,  precioUnitario: 75.00, tipoIva: "IVA_STANDARD" }] },
    ];

    for (const inv of invoices) {
      const { totals, details } = computeInvoice(inv.lines);
      await prisma.invoice.upsert({
        where:  { companyId_secuencial: { companyId: tech.id, secuencial: seq(inv.secuencial) } },
        update: {},
        create: {
          companyId: tech.id,
          clientId:  inv.clientId,
          secuencial: seq(inv.secuencial),
          fechaEmision: inv.fecha,
          ambiente: "PRUEBAS",
          estado:   inv.estado as never,
          branchId: techMatriz.id,
          ...totals,
          details: { create: details },
        },
      });
    }

    // Actualizar el contador secuencial
    await prisma.company.update({ where: { id: tech.id }, data: { secuencialSiguiente: invoices.length + 1 } });
    console.log(`  ✅ ${invoices.length} facturas creadas (ene-abr 2026, todos los estados)`);
  } else {
    console.log("  ⏭  Facturas de TechSoluciones ya existen, omitidas");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FACTURAS — Alimentos del Valle
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Facturas: Alimentos del Valle ────────────────────────────");

  const existingAliInvoices = await prisma.invoice.count({ where: { companyId: alimentos.id } });
  if (existingAliInvoices === 0) {
    const ac = await prisma.client.findMany({ where: { companyId: alimentos.id }, select: { id: true, identificacion: true } });
    const acMap = Object.fromEntries(ac.map((c) => [c.identificacion, c.id]));

    const aliInvoices = [
      // Febrero y Marzo 2026
      { sec: 1,  clientId: acMap["0190123456001"], fecha: ecuDate("2026-02-10"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "ARR001", descripcion: "Arroz Superior 25kg", cantidad: 20, precioUnitario: 18.50, tipoIva: "IVA_0" as TipoIva }, { codigoPrincipal: "AZU001", descripcion: "Azúcar Morena 50kg", cantidad: 10, precioUnitario: 28.00, tipoIva: "IVA_0" as TipoIva }] },
      { sec: 2,  clientId: acMap["0990876543001"], fecha: ecuDate("2026-02-20"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "ARR001", descripcion: "Arroz Superior 25kg", cantidad: 50, precioUnitario: 18.50, tipoIva: "IVA_0" as TipoIva }, { codigoPrincipal: "HAR001", descripcion: "Harina de Trigo 50kg", cantidad: 20, precioUnitario: 21.00, tipoIva: "IVA_0" as TipoIva }] },
      { sec: 3,  clientId: acMap["0105678901"],    fecha: ecuDate("2026-03-05"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "ACE001", descripcion: "Aceite de Girasol 1L", cantidad: 100, precioUnitario: 2.80, tipoIva: "IVA_0" as TipoIva }] },
      { sec: 4,  clientId: acMap["0190123456001"], fecha: ecuDate("2026-03-15"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "AZU001", descripcion: "Azúcar Morena 50kg", cantidad: 30, precioUnitario: 28.00, tipoIva: "IVA_0" as TipoIva }, { codigoPrincipal: "SAL001", descripcion: "Sal Yodada 1kg", cantidad: 200, precioUnitario: 0.45, tipoIva: "IVA_0" as TipoIva }] },
      { sec: 5,  clientId: acMap["0990876543001"], fecha: ecuDate("2026-03-25"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "ARR001", descripcion: "Arroz Superior 25kg", cantidad: 80, precioUnitario: 18.50, tipoIva: "IVA_0" as TipoIva }] },
      // Abril 2026
      { sec: 6,  clientId: acMap["0190123456001"], fecha: ecuDate("2026-04-03"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "ARR001", descripcion: "Arroz Superior 25kg", cantidad: 30, precioUnitario: 18.50, tipoIva: "IVA_0" as TipoIva }, { codigoPrincipal: "AZU001", descripcion: "Azúcar Morena 50kg", cantidad: 20, precioUnitario: 28.00, tipoIva: "IVA_0" as TipoIva }, { codigoPrincipal: "HAR001", descripcion: "Harina de Trigo 50kg", cantidad: 10, precioUnitario: 21.00, tipoIva: "IVA_0" as TipoIva }] },
      { sec: 7,  clientId: acMap["0990876543001"], fecha: ecuDate("2026-04-08"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "BEB001", descripcion: "Agua Purificada 20L", cantidad: 50, precioUnitario: 3.50, tipoIva: "IVA_STANDARD" as TipoIva }, { codigoPrincipal: "COND01", descripcion: "Condimentos Pack x12", cantidad: 20, precioUnitario: 15.60, tipoIva: "IVA_STANDARD" as TipoIva }] },
      { sec: 8,  clientId: acMap["0105678901"],    fecha: ecuDate("2026-04-12"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "ACE001", descripcion: "Aceite de Girasol 1L", cantidad: 150, precioUnitario: 2.80, tipoIva: "IVA_0" as TipoIva }] },
      { sec: 9,  clientId: acMap["0190123456001"], fecha: ecuDate("2026-04-18"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "SAL001", descripcion: "Sal Yodada 1kg", cantidad: 500, precioUnitario: 0.45, tipoIva: "IVA_0" as TipoIva }, { codigoPrincipal: "AZU001", descripcion: "Azúcar Morena 50kg", cantidad: 15, precioUnitario: 28.00, tipoIva: "IVA_0" as TipoIva }] },
      { sec: 10, clientId: acMap["9999999999999"], fecha: ecuDate("2026-04-22"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "ARR001", descripcion: "Arroz Superior 25kg", cantidad: 5, precioUnitario: 18.50, tipoIva: "IVA_0" as TipoIva }] },
      { sec: 11, clientId: acMap["0990876543001"], fecha: randDate("2026-04-23","2026-04-24"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "ARR001", descripcion: "Arroz Superior 25kg", cantidad: 100, precioUnitario: 18.50, tipoIva: "IVA_0" as TipoIva }, { codigoPrincipal: "HAR001", descripcion: "Harina de Trigo 50kg", cantidad: 30, precioUnitario: 21.00, tipoIva: "IVA_0" as TipoIva }] },
      // Hoy
      { sec: 12, clientId: acMap["0190123456001"], fecha: ecuDate("2026-04-25"), estado: "PENDIENTE" as const, lines: [{ codigoPrincipal: "AZU001", descripcion: "Azúcar Morena 50kg", cantidad: 25, precioUnitario: 28.00, tipoIva: "IVA_0" as TipoIva }] },
      { sec: 13, clientId: acMap["9999999999999"], fecha: ecuDate("2026-04-25"), estado: "PENDIENTE" as const, lines: [{ codigoPrincipal: "ACE001", descripcion: "Aceite de Girasol 1L", cantidad: 200, precioUnitario: 2.80, tipoIva: "IVA_0" as TipoIva }] },
    ];

    for (const inv of aliInvoices) {
      const { totals, details } = computeInvoice(inv.lines);
      await prisma.invoice.upsert({
        where:  { companyId_secuencial: { companyId: alimentos.id, secuencial: seq(inv.sec) } },
        update: {},
        create: {
          companyId: alimentos.id, clientId: inv.clientId,
          secuencial: seq(inv.sec), fechaEmision: inv.fecha,
          ambiente: "PRUEBAS", estado: inv.estado as never,
          branchId: alimentosMatriz.id, ...totals,
          details: { create: details },
        },
      });
    }
    await prisma.company.update({ where: { id: alimentos.id }, data: { secuencialSiguiente: aliInvoices.length + 1 } });
    console.log(`  ✅ ${aliInvoices.length} facturas (IVA 0% y mixtas)`);
  } else {
    console.log("  ⏭  Facturas de Alimentos ya existen, omitidas");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FACTURAS — Mora & Asociados
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── Facturas: Mora & Asociados ───────────────────────────────");

  const existingJurInvoices = await prisma.invoice.count({ where: { companyId: juridica.id } });
  if (existingJurInvoices === 0) {
    const jc = await prisma.client.findMany({ where: { companyId: juridica.id }, select: { id: true, identificacion: true } });
    const jcMap = Object.fromEntries(jc.map((c) => [c.identificacion, c.id]));

    const jurInvoices = [
      { sec: 1, clientId: jcMap["1791234567001"], fecha: ecuDate("2026-02-05"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "HON001", descripcion: "Honorarios por Consulta Legal (hora)", cantidad: 3, precioUnitario: 120.0, tipoIva: "IVA_STANDARD" as TipoIva }] },
      { sec: 2, clientId: jcMap["1723456789"],    fecha: ecuDate("2026-02-20"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "HON003", descripcion: "Redacción de Contratos", cantidad: 1, precioUnitario: 250.0, tipoIva: "IVA_STANDARD" as TipoIva }] },
      { sec: 3, clientId: jcMap["1791234567001"], fecha: ecuDate("2026-03-08"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "HON002", descripcion: "Patrocinio en Juicio Civil", cantidad: 1, precioUnitario: 800.0, tipoIva: "IVA_STANDARD" as TipoIva }] },
      { sec: 4, clientId: jcMap["1723456789"],    fecha: ecuDate("2026-03-20"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "HON004", descripcion: "Trámite de Escritura Pública", cantidad: 1, precioUnitario: 180.0, tipoIva: "IVA_STANDARD" as TipoIva }, { codigoPrincipal: "HON001", descripcion: "Honorarios por Consulta Legal (hora)", cantidad: 1, precioUnitario: 120.0, tipoIva: "IVA_STANDARD" as TipoIva }] },
      { sec: 5, clientId: jcMap["1791234567001"], fecha: ecuDate("2026-04-05"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "HON001", descripcion: "Honorarios por Consulta Legal (hora)", cantidad: 5, precioUnitario: 120.0, tipoIva: "IVA_STANDARD" as TipoIva }] },
      { sec: 6, clientId: jcMap["9999999999999"], fecha: ecuDate("2026-04-10"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "HON003", descripcion: "Redacción de Contratos", cantidad: 2, precioUnitario: 250.0, tipoIva: "IVA_STANDARD" as TipoIva }] },
      { sec: 7, clientId: jcMap["1723456789"],    fecha: ecuDate("2026-04-18"), estado: "AUTORIZADO" as const, lines: [{ codigoPrincipal: "HON002", descripcion: "Patrocinio en Juicio Civil", cantidad: 1, precioUnitario: 800.0, tipoIva: "IVA_STANDARD" as TipoIva }] },
      { sec: 8, clientId: jcMap["1791234567001"], fecha: ecuDate("2026-04-25"), estado: "PENDIENTE"  as const, lines: [{ codigoPrincipal: "HON001", descripcion: "Honorarios por Consulta Legal (hora)", cantidad: 4, precioUnitario: 120.0, tipoIva: "IVA_STANDARD" as TipoIva }, { codigoPrincipal: "HON004", descripcion: "Trámite de Escritura Pública", cantidad: 1, precioUnitario: 180.0, tipoIva: "IVA_STANDARD" as TipoIva }] },
    ];

    for (const inv of jurInvoices) {
      const { totals, details } = computeInvoice(inv.lines);
      await prisma.invoice.upsert({
        where:  { companyId_secuencial: { companyId: juridica.id, secuencial: seq(inv.sec) } },
        update: {},
        create: {
          companyId: juridica.id, clientId: inv.clientId,
          secuencial: seq(inv.sec), fechaEmision: inv.fecha,
          ambiente: "PRUEBAS", estado: inv.estado as never,
          branchId: juridicaMatriz.id, ...totals,
          details: { create: details },
        },
      });
    }
    await prisma.company.update({ where: { id: juridica.id }, data: { secuencialSiguiente: jurInvoices.length + 1 } });
    console.log(`  ✅ ${jurInvoices.length} facturas`);
  } else {
    console.log("  ⏭  Facturas de Mora & Asociados ya existen, omitidas");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESUMEN
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n✨ Seed completado exitosamente!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 CREDENCIALES DE ACCESO\n");

  console.log("🏢 TechSoluciones S.A.         RUC: 1791234560001  (3 sucursales)");
  console.log("   ADMIN    admin@techsoluciones.com   / admin123   → Matriz");
  console.log("   EMPLOYED norte@techsoluciones.com  / norte123   → Sucursal Norte");
  console.log("   EMPLOYED sur@techsoluciones.com    / sur123     → Sucursal Sur");
  console.log("   EMPLOYED matriz@techsoluciones.com / emp123     → Matriz\n");

  console.log("🏢 Alimentos del Valle Cía.    RUC: 0190456780001  (2 sucursales)");
  console.log("   ADMIN    gerente@vallefoods.com    / gerente123 → Cuenca (Matriz)");
  console.log("   EMPLOYED cuenca@vallefoods.com     / cuenca123  → Cuenca");
  console.log("   EMPLOYED guayaquil@vallefoods.com  / gye123     → Guayaquil\n");

  console.log("🏢 Mora & Asociados            RUC: 1704567890001  (1 sucursal)");
  console.log("   ADMIN    dr.mora@moraabogados.com  / mora123    → Oficina Principal");
  console.log("   EMPLOYED asistente@moraabogados.com/ asist123   → Oficina Principal\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 DATOS DE PRUEBA GENERADOS (TechSoluciones)\n");
  console.log("   Facturas : 46 total (ene-abr 2026)");
  console.log("              41 AUTORIZADO · 4 PENDIENTE · 1 DEVUELTA · 1 ANULADO · 1 RECHAZADO");
  console.log("   Inventario: 5 alertas de stock (BIEN001 × 3 sucursales + BIEN004 × 2)");
  console.log("   Compras   : 5 órdenes (2 marzo + 3 abril)");
  console.log("   Proveedores: 3  |  Sucursales: 3  |  Clientes: 6\n");
  console.log("📊 DATOS DE PRUEBA (Alimentos del Valle)\n");
  console.log("   Facturas : 13 total (feb-abr 2026)  |  Compras: 4");
  console.log("   Inventario: 3 alertas de stock (AZU001 × 2 + HAR001 × 1)\n");
  console.log("📊 DATOS DE PRUEBA (Mora & Asociados)\n");
  console.log("   Facturas : 8 total (feb-abr 2026)  |  Solo servicios\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💡 Ambiente: PRUEBAS  |  Fecha base del seed: 2026-04-25");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
