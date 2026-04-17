import "dotenv/config";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as never);

// Inline the required service calls to avoid path alias issues
import { sriService } from "../modules/sri/sri.service";
import { invoiceRepository } from "../modules/invoices/invoice.repository";

async function main() {
  const companyId = "cmo0h2dqz00000ctz6qsfpscf";
  const clientId = "cmo0h2e2o00030ctzre8ixlbd";

  console.log("1. Creating invoice...");
  const invoice = await invoiceRepository.create(companyId, clientId, "PRODUCCION", {
    clientId,
    details: [
      {
        codigoPrincipal: "TEST001",
        descripcion: "Prueba de facturacion electronica",
        cantidad: 1,
        precioUnitario: 10.0,
        tipoIva: "IVA_STANDARD",
      },
    ],
  });
  console.log(`   Created: ${invoice.id}  secuencial: ${invoice.secuencial}`);

  console.log("2. Processing through SRI (may take up to 20s)...");
  const result = await sriService.processInvoice(invoice.id, companyId);
  console.log("3. SRI result:", JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
