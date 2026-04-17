const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const id = process.argv[2];
  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { xmlFirmado: true, xmlGenerado: true },
  });
  if (!inv) { console.error("Not found"); return; }
  
  // Show first 2000 chars of xmlFirmado
  console.log("=== xmlFirmado (first 2000 chars) ===");
  console.log(inv.xmlFirmado?.slice(0, 2000));
  console.log("\n=== Last 500 chars (signature area) ===");
  const xml = inv.xmlFirmado || "";
  // Find the ds:Signature start
  const sigIdx = xml.indexOf('<ds:Signature');
  if (sigIdx !== -1) {
    console.log("ds:Signature starts at char", sigIdx);
    console.log(xml.slice(sigIdx, sigIdx + 500));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
