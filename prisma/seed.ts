import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  console.log("🌱 Iniciando seed de base de datos...");

  // ── Company ───────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { ruc: "0999999999001" },
    update: {},
    create: {
      ruc: "0999999999001",
      razonSocial: "EMPRESA DEMO S.A.",
      nombreComercial: "DEMO FACTURACIÓN",
      dirMatriz: "Av. República del Salvador N34-183 y Moscú, Quito",
      estab: "001",
      ptoEmi: "001",
      ambiente: "PRUEBAS",
      tipoEmision: "NORMAL",
      obligadoContab: true,
    },
  });

  console.log(`  ✅ Empresa creada: ${company.razonSocial}`);

  // ── Admin user ────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@empresa.com" },
    update: {},
    create: {
      email: "admin@empresa.com",
      name: "Administrador",
      password: adminPassword,
      role: "ADMIN",
      companyId: company.id,
    },
  });
  console.log(`  ✅ Admin: ${admin.email} / admin123`);

  // ── Emisor user ───────────────────────────────────────────────────────────
  const emisorPassword = await bcrypt.hash("emisor123", 12);
  const emisor = await prisma.user.upsert({
    where: { email: "emisor@empresa.com" },
    update: {},
    create: {
      email: "emisor@empresa.com",
      name: "Emisor Demo",
      password: emisorPassword,
      role: "EMISOR",
      companyId: company.id,
    },
  });
  console.log(`  ✅ Emisor: ${emisor.email} / emisor123`);

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientsData = [
    {
      tipoIdentif: "RUC" as const,
      identificacion: "0990012345001",
      razonSocial: "COMERCIAL EL GRAN ALMACÉN CIA. LTDA.",
      email: "compras@granalm.com",
      telefono: "0998765432",
      direccion: "Av. Amazonas 456, Quito",
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

  for (const clientData of clientsData) {
    await prisma.client.upsert({
      where: {
        companyId_identificacion: {
          companyId: company.id,
          identificacion: clientData.identificacion,
        },
      },
      update: {},
      create: { companyId: company.id, ...clientData },
    });
  }
  console.log(`  ✅ ${clientsData.length} clientes creados`);

  // ── Products ──────────────────────────────────────────────────────────────
  const productsData = [
    {
      codigoPrincipal: "SERV001",
      descripcion: "Consultoría Tecnológica (hora)",
      precio: 75.0,
      tipoIva: "IVA_STANDARD" as const,
      tipo: "SERVICIO" as const,
    },
    {
      codigoPrincipal: "SERV002",
      descripcion: "Desarrollo de Software (hora)",
      precio: 50.0,
      tipoIva: "IVA_STANDARD" as const,
      tipo: "SERVICIO" as const,
    },
    {
      codigoPrincipal: "BIEN001",
      descripcion: "Laptop HP ProBook 450 G9",
      precio: 899.99,
      tipoIva: "IVA_STANDARD" as const,
      tipo: "BIEN" as const,
    },
    {
      codigoPrincipal: "BIEN002",
      descripcion: "Mouse Inalámbrico Logitech MX Master",
      precio: 45.0,
      tipoIva: "IVA_STANDARD" as const,
      tipo: "BIEN" as const,
    },
    {
      codigoPrincipal: "BIEN003",
      descripcion: "Disco Duro Externo 1TB",
      precio: 65.0,
      tipoIva: "IVA_STANDARD" as const,
      tipo: "BIEN" as const,
    },
    {
      codigoPrincipal: "BIEN004",
      descripcion: "Arroz Integral 1kg",
      precio: 1.25,
      tipoIva: "IVA_0" as const,
      tipo: "BIEN" as const,
    },
    {
      codigoPrincipal: "BIEN005",
      descripcion: "Medicamento Paracetamol 500mg x10",
      precio: 0.85,
      tipoIva: "IVA_0" as const,
      tipo: "BIEN" as const,
    },
  ];

  for (const productData of productsData) {
    await prisma.product.upsert({
      where: {
        companyId_codigoPrincipal: {
          companyId: company.id,
          codigoPrincipal: productData.codigoPrincipal,
        },
      },
      update: {},
      create: { companyId: company.id, ...productData },
    });
  }
  console.log(`  ✅ ${productsData.length} productos creados`);

  console.log("\n✨ Seed completado exitosamente!");
  console.log("\n📋 Credenciales de acceso:");
  console.log("   Admin:  admin@empresa.com  / admin123");
  console.log("   Emisor: emisor@empresa.com / emisor123");
  console.log("\n🌐 Ambiente configurado: PRUEBAS");
  console.log("💡 Para usar con SRI real, configure SRI_USE_MOCK=false en .env");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
