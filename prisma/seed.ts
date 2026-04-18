import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as never);

async function hashAll(passwords: string[]) {
  return Promise.all(passwords.map((p) => bcrypt.hash(p, 12)));
}

async function main() {
  console.log("🌱 Iniciando seed de base de datos...\n");

  // ════════════════════════════════════════════════════════════════════════════
  // EMPRESA 1 — TechSoluciones (empresa de tecnología con 3 sucursales)
  // ════════════════════════════════════════════════════════════════════════════
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

  // Sucursales de TechSoluciones
  const [techMatriz, techNorte, techSur] = await Promise.all([
    prisma.branch.upsert({
      where: { id: "tech-branch-matriz" },
      update: {},
      create: {
        id: "tech-branch-matriz",
        companyId: tech.id,
        nombre: "Matriz",
        direccion: "Av. Naciones Unidas E10-44 y Shyris, Quito",
      },
    }),
    prisma.branch.upsert({
      where: { id: "tech-branch-norte" },
      update: {},
      create: {
        id: "tech-branch-norte",
        companyId: tech.id,
        nombre: "Sucursal Norte",
        direccion: "Av. De los Shyris N36-189 y Suecia, Quito",
      },
    }),
    prisma.branch.upsert({
      where: { id: "tech-branch-sur" },
      update: {},
      create: {
        id: "tech-branch-sur",
        companyId: tech.id,
        nombre: "Sucursal Sur",
        direccion: "Av. Rodrigo de Chávez y Alonso de Angulo, Quito",
      },
    }),
  ]);
  console.log(`  ✅ 3 sucursales: Matriz, Norte, Sur`);

  // Usuarios de TechSoluciones
  const [pw1, pw2, pw3, pw4] = await hashAll(["admin123", "norte123", "sur123", "emp123"]);

  const [techAdmin, techEmpNorte, techEmpSur, techEmpMatriz] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@techsoluciones.com" },
      update: {},
      create: {
        email: "admin@techsoluciones.com",
        name: "Carlos Mendoza",
        password: pw1,
        role: "ADMIN",
        companyId: tech.id,
        branchId: techMatriz.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "norte@techsoluciones.com" },
      update: {},
      create: {
        email: "norte@techsoluciones.com",
        name: "Andrea Viteri",
        password: pw2,
        role: "EMPLOYED",
        companyId: tech.id,
        branchId: techNorte.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "sur@techsoluciones.com" },
      update: {},
      create: {
        email: "sur@techsoluciones.com",
        name: "Roberto Salazar",
        password: pw3,
        role: "EMPLOYED",
        companyId: tech.id,
        branchId: techSur.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "matriz@techsoluciones.com" },
      update: {},
      create: {
        email: "matriz@techsoluciones.com",
        name: "Lucía Paredes",
        password: pw4,
        role: "EMPLOYED",
        companyId: tech.id,
        branchId: techMatriz.id,
      },
    }),
  ]);
  console.log(`  ✅ 4 usuarios: 1 ADMIN + 3 EMPLOYED (una por sucursal)`);
  void techAdmin; void techEmpNorte; void techEmpSur; void techEmpMatriz;

  // Clientes de TechSoluciones
  const techClients = [
    {
      tipoIdentif: "RUC" as const,
      identificacion: "0990012345001",
      razonSocial: "COMERCIAL EL GRAN ALMACÉN CIA. LTDA.",
      email: "compras@granalm.com",
      telefono: "0998765432",
      direccion: "Av. Amazonas 456, Quito",
    },
    {
      tipoIdentif: "RUC" as const,
      identificacion: "1791856230001",
      razonSocial: "DISTRIBUIDORA TECNOMUNDO S.A.",
      email: "tecnomundo@gmail.com",
      telefono: "0995551234",
      direccion: "Calle Versalles 432, Quito",
    },
    {
      tipoIdentif: "CEDULA" as const,
      identificacion: "1710234567",
      razonSocial: "Juan Carlos Pérez Mora",
      email: "juan.perez@gmail.com",
      telefono: "0991234567",
      direccion: "Calle Ladrón de Guevara E11-45, Quito",
    },
    {
      tipoIdentif: "CEDULA" as const,
      identificacion: "0201456789",
      razonSocial: "María Fernanda Torres",
      email: "mftorres@hotmail.com",
      telefono: "0987001234",
      direccion: "Av. 6 de Diciembre N52-80, Quito",
    },
    {
      tipoIdentif: "PASAPORTE" as const,
      identificacion: "P12345678",
      razonSocial: "John Smith",
      email: "jsmith@company.com",
      telefono: "0987654321",
      direccion: "Hotel Marriott, Quito",
    },
    {
      tipoIdentif: "CONSUMIDOR_FINAL" as const,
      identificacion: "9999999999999",
      razonSocial: "CONSUMIDOR FINAL",
      email: null,
      telefono: null,
      direccion: null,
    },
  ];

  for (const c of techClients) {
    await prisma.client.upsert({
      where: { companyId_identificacion: { companyId: tech.id, identificacion: c.identificacion } },
      update: {},
      create: { companyId: tech.id, ...c },
    });
  }
  console.log(`  ✅ ${techClients.length} clientes`);

  // Productos de TechSoluciones
  const techProducts = [
    { codigoPrincipal: "SERV001", descripcion: "Consultoría Tecnológica (hora)", precio: 75.0,  tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: true },
    { codigoPrincipal: "SERV002", descripcion: "Desarrollo de Software (hora)",  precio: 50.0,  tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: true },
    { codigoPrincipal: "SERV003", descripcion: "Soporte Técnico (hora)",         precio: 35.0,  tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: false },
    { codigoPrincipal: "SERV004", descripcion: "Capacitación Empresarial (día)", precio: 350.0, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: false },
    { codigoPrincipal: "BIEN001", descripcion: "Laptop HP ProBook 450 G9",       precio: 899.99,tipoIva: "IVA_STANDARD" as const, tipo: "BIEN" as const,    isFavorite: false },
    { codigoPrincipal: "BIEN002", descripcion: "Mouse Inalámbrico Logitech MX",  precio: 45.0,  tipoIva: "IVA_STANDARD" as const, tipo: "BIEN" as const,    isFavorite: false },
    { codigoPrincipal: "BIEN003", descripcion: "Disco Duro Externo 1TB",         precio: 65.0,  tipoIva: "IVA_STANDARD" as const, tipo: "BIEN" as const,    isFavorite: false },
    { codigoPrincipal: "BIEN004", descripcion: "Teclado Mecánico Redragon",      precio: 89.0,  tipoIva: "IVA_STANDARD" as const, tipo: "BIEN" as const,    isFavorite: false },
    { codigoPrincipal: "LIC001",  descripcion: "Licencia Microsoft 365 (anual)", precio: 120.0, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: true },
  ];

  for (const p of techProducts) {
    await prisma.product.upsert({
      where: { companyId_codigoPrincipal: { companyId: tech.id, codigoPrincipal: p.codigoPrincipal } },
      update: {},
      create: { companyId: tech.id, ...p },
    });
  }
  console.log(`  ✅ ${techProducts.length} productos\n`);

  // ════════════════════════════════════════════════════════════════════════════
  // EMPRESA 2 — Distribuidora Alimentos del Valle (2 sucursales)
  // ════════════════════════════════════════════════════════════════════════════
  console.log("── Empresa 2: Alimentos del Valle Cía. Ltda. ───────────────");

  const alimentos = await prisma.company.upsert({
    where: { ruc: "0190456780001" },
    update: {},
    create: {
      ruc: "0190456780001",
      razonSocial: "ALIMENTOS DEL VALLE CIA. LTDA.",
      nombreComercial: "Valle Foods",
      dirMatriz: "Av. Max Uhle y Av. Gil Ramírez Dávalos, Cuenca",
      estab: "001",
      ptoEmi: "001",
      ambiente: "PRUEBAS",
      tipoEmision: "NORMAL",
      obligadoContab: false,
      secuencialInicio: 1,
    },
  });
  console.log(`  ✅ ${alimentos.razonSocial}`);

  const [alimentosMatriz, alimentosGye] = await Promise.all([
    prisma.branch.upsert({
      where: { id: "ali-branch-cuenca" },
      update: {},
      create: {
        id: "ali-branch-cuenca",
        companyId: alimentos.id,
        nombre: "Cuenca — Matriz",
        direccion: "Av. Max Uhle y Av. Gil Ramírez Dávalos, Cuenca",
      },
    }),
    prisma.branch.upsert({
      where: { id: "ali-branch-guayaquil" },
      update: {},
      create: {
        id: "ali-branch-guayaquil",
        companyId: alimentos.id,
        nombre: "Guayaquil",
        direccion: "Av. Francisco de Orellana, Guayaquil",
      },
    }),
  ]);
  console.log(`  ✅ 2 sucursales: Cuenca (Matriz), Guayaquil`);

  const [pw5, pw6, pw7] = await hashAll(["gerente123", "cuenca123", "gye123"]);

  await Promise.all([
    prisma.user.upsert({
      where: { email: "gerente@vallefoods.com" },
      update: {},
      create: {
        email: "gerente@vallefoods.com",
        name: "Patricia Álvarez",
        password: pw5,
        role: "ADMIN",
        companyId: alimentos.id,
        branchId: alimentosMatriz.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "cuenca@vallefoods.com" },
      update: {},
      create: {
        email: "cuenca@vallefoods.com",
        name: "Diego Cárdenas",
        password: pw6,
        role: "EMPLOYED",
        companyId: alimentos.id,
        branchId: alimentosMatriz.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "guayaquil@vallefoods.com" },
      update: {},
      create: {
        email: "guayaquil@vallefoods.com",
        name: "Sofía Reyes",
        password: pw7,
        role: "EMPLOYED",
        companyId: alimentos.id,
        branchId: alimentosGye.id,
      },
    }),
  ]);
  console.log(`  ✅ 3 usuarios: 1 ADMIN + 2 EMPLOYED`);

  const alimentosClients = [
    { tipoIdentif: "RUC" as const, identificacion: "0190123456001", razonSocial: "SUPERMERCADO CORAL S.A.", email: "compras@coral.com", telefono: "0994321000", direccion: "Av. Solano 12, Cuenca" },
    { tipoIdentif: "RUC" as const, identificacion: "0990876543001", razonSocial: "MEGAMAXI S.A.",            email: null, telefono: null, direccion: "Av. Las Monjas, Guayaquil" },
    { tipoIdentif: "CEDULA" as const, identificacion: "0105678901",  razonSocial: "Jorge Iván Quinde",       email: "jorge.quinde@gmail.com", telefono: "0985559988", direccion: "Calle Larga 3-45, Cuenca" },
    { tipoIdentif: "CONSUMIDOR_FINAL" as const, identificacion: "9999999999999", razonSocial: "CONSUMIDOR FINAL", email: null, telefono: null, direccion: null },
  ];

  for (const c of alimentosClients) {
    await prisma.client.upsert({
      where: { companyId_identificacion: { companyId: alimentos.id, identificacion: c.identificacion } },
      update: {},
      create: { companyId: alimentos.id, ...c },
    });
  }
  console.log(`  ✅ ${alimentosClients.length} clientes`);

  const alimentosProducts = [
    { codigoPrincipal: "ARR001", descripcion: "Arroz Superior 25kg",         precio: 18.50, tipoIva: "IVA_0" as const, tipo: "BIEN" as const, isFavorite: true },
    { codigoPrincipal: "AZU001", descripcion: "Azúcar Morena 50kg",          precio: 28.00, tipoIva: "IVA_0" as const, tipo: "BIEN" as const, isFavorite: true },
    { codigoPrincipal: "ACE001", descripcion: "Aceite de Girasol 1L",        precio: 2.80,  tipoIva: "IVA_0" as const, tipo: "BIEN" as const, isFavorite: false },
    { codigoPrincipal: "HAR001", descripcion: "Harina de Trigo 50kg",        precio: 21.00, tipoIva: "IVA_0" as const, tipo: "BIEN" as const, isFavorite: false },
    { codigoPrincipal: "SAL001", descripcion: "Sal Yodada 1kg",              precio: 0.45,  tipoIva: "IVA_0" as const, tipo: "BIEN" as const, isFavorite: false },
    { codigoPrincipal: "BEB001", descripcion: "Agua Purificada 20L (bidón)", precio: 3.50,  tipoIva: "IVA_STANDARD" as const, tipo: "BIEN" as const, isFavorite: false },
    { codigoPrincipal: "COND01", descripcion: "Condimentos Pack x12",        precio: 15.60, tipoIva: "IVA_STANDARD" as const, tipo: "BIEN" as const, isFavorite: false },
  ];

  for (const p of alimentosProducts) {
    await prisma.product.upsert({
      where: { companyId_codigoPrincipal: { companyId: alimentos.id, codigoPrincipal: p.codigoPrincipal } },
      update: {},
      create: { companyId: alimentos.id, ...p },
    });
  }
  console.log(`  ✅ ${alimentosProducts.length} productos\n`);

  // ════════════════════════════════════════════════════════════════════════════
  // EMPRESA 3 — Consultora Jurídica (empresa pequeña, 1 sucursal, 1 usuario)
  // ════════════════════════════════════════════════════════════════════════════
  console.log("── Empresa 3: Estudio Jurídico Mora & Asociados ────────────");

  const juridica = await prisma.company.upsert({
    where: { ruc: "1704567890001" },
    update: {},
    create: {
      ruc: "1704567890001",
      razonSocial: "ESTUDIO JURÍDICO MORA & ASOCIADOS",
      nombreComercial: "Mora Abogados",
      dirMatriz: "Av. Colón E4-60 y 9 de Octubre, Quito",
      estab: "001",
      ptoEmi: "001",
      ambiente: "PRUEBAS",
      tipoEmision: "NORMAL",
      obligadoContab: false,
      secuencialInicio: 1,
    },
  });
  console.log(`  ✅ ${juridica.razonSocial}`);

  const juridicaMatriz = await prisma.branch.upsert({
    where: { id: "jur-branch-matriz" },
    update: {},
    create: {
      id: "jur-branch-matriz",
      companyId: juridica.id,
      nombre: "Oficina Principal",
      direccion: "Av. Colón E4-60 y 9 de Octubre, Quito",
    },
  });
  console.log(`  ✅ 1 sucursal: Oficina Principal`);

  const [pw8, pw9] = await hashAll(["mora123", "asist123"]);

  await Promise.all([
    prisma.user.upsert({
      where: { email: "dr.mora@moraabogados.com" },
      update: {},
      create: {
        email: "dr.mora@moraabogados.com",
        name: "Dr. Rodrigo Mora",
        password: pw8,
        role: "ADMIN",
        companyId: juridica.id,
        branchId: juridicaMatriz.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "asistente@moraabogados.com" },
      update: {},
      create: {
        email: "asistente@moraabogados.com",
        name: "Valeria Castro",
        password: pw9,
        role: "EMPLOYED",
        companyId: juridica.id,
        branchId: juridicaMatriz.id,
      },
    }),
  ]);
  console.log(`  ✅ 2 usuarios: 1 ADMIN + 1 EMPLOYED`);

  const juridicaClients = [
    { tipoIdentif: "RUC" as const, identificacion: "1791234567001", razonSocial: "IMPORTADORA GLOBAL S.A.", email: "legal@importadora.com", telefono: "0992345678", direccion: "Av. Eloy Alfaro N32-450, Quito" },
    { tipoIdentif: "CEDULA" as const, identificacion: "1723456789", razonSocial: "Daniela Suárez Ponce", email: "dsuarez@gmail.com", telefono: "0981234567", direccion: "Los Eucaliptos 234, Cumbayá" },
    { tipoIdentif: "CONSUMIDOR_FINAL" as const, identificacion: "9999999999999", razonSocial: "CONSUMIDOR FINAL", email: null, telefono: null, direccion: null },
  ];

  for (const c of juridicaClients) {
    await prisma.client.upsert({
      where: { companyId_identificacion: { companyId: juridica.id, identificacion: c.identificacion } },
      update: {},
      create: { companyId: juridica.id, ...c },
    });
  }

  const juridicaProducts = [
    { codigoPrincipal: "HON001", descripcion: "Honorarios por Consulta Legal (hora)",     precio: 120.0, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: true },
    { codigoPrincipal: "HON002", descripcion: "Patrocinio en Juicio Civil",               precio: 800.0, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: false },
    { codigoPrincipal: "HON003", descripcion: "Redacción de Contratos",                   precio: 250.0, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: true },
    { codigoPrincipal: "HON004", descripcion: "Trámite de Escritura Pública",             precio: 180.0, tipoIva: "IVA_STANDARD" as const, tipo: "SERVICIO" as const, isFavorite: false },
  ];

  for (const p of juridicaProducts) {
    await prisma.product.upsert({
      where: { companyId_codigoPrincipal: { companyId: juridica.id, codigoPrincipal: p.codigoPrincipal } },
      update: {},
      create: { companyId: juridica.id, ...p },
    });
  }
  console.log(`  ✅ ${juridicaClients.length} clientes, ${juridicaProducts.length} productos\n`);

  // ════════════════════════════════════════════════════════════════════════════
  // RESUMEN
  // ════════════════════════════════════════════════════════════════════════════
  console.log("✨ Seed completado exitosamente!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 CREDENCIALES DE ACCESO\n");

  console.log("🏢 TechSoluciones S.A.  (3 sucursales)");
  console.log("   ADMIN    admin@techsoluciones.com   / admin123   → Matriz");
  console.log("   EMPLOYED norte@techsoluciones.com  / norte123   → Sucursal Norte");
  console.log("   EMPLOYED sur@techsoluciones.com    / sur123     → Sucursal Sur");
  console.log("   EMPLOYED matriz@techsoluciones.com / emp123     → Matriz\n");

  console.log("🏢 Alimentos del Valle  (2 sucursales)");
  console.log("   ADMIN    gerente@vallefoods.com    / gerente123 → Cuenca (Matriz)");
  console.log("   EMPLOYED cuenca@vallefoods.com     / cuenca123  → Cuenca");
  console.log("   EMPLOYED guayaquil@vallefoods.com  / gye123     → Guayaquil\n");

  console.log("🏢 Mora & Asociados     (1 sucursal)");
  console.log("   ADMIN    dr.mora@moraabogados.com  / mora123    → Oficina Principal");
  console.log("   EMPLOYED asistente@moraabogados.com/ asist123   → Oficina Principal\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💡 Todos los ambientes en PRUEBAS. SRI_USE_MOCK=true por defecto.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
