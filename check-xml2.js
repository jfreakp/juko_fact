const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const id = process.argv[2];
  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { xmlFirmado: true },
  });
  const xml = inv.xmlFirmado || "";
  // Show the entire ds:SignedInfo block
  const siMatch = xml.match(/<ds:SignedInfo[\s\S]*?<\/ds:SignedInfo>/);
  console.log("=== ds:SignedInfo ===");
  console.log(siMatch?.[0]);
  
  // Show ds:Object block (SignedProperties)
  const objMatch = xml.match(/<ds:Object[\s\S]*?<\/ds:Object>/);
  console.log("\n=== ds:Object (first 1000 chars) ===");
  console.log(objMatch?.[0]?.slice(0, 1000));
}

main().catch(console.error).finally(() => prisma.$disconnect());
