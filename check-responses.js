const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const invoices = await prisma.invoice.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, estado: true, claveAcceso: true, createdAt: true },
  });
  console.log("Recent invoices:");
  for (const inv of invoices) {
    console.log(`  ${inv.id} | ${inv.estado} | ${inv.claveAcceso?.slice(0,20)}... | ${inv.createdAt}`);
    const resps = await prisma.sRIResponse.findMany({
      where: { invoiceId: inv.id },
      select: { tipo: true, rawResponse: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    for (const r of resps) {
      const msgs = r.rawResponse?.match(/<mensajes>[\s\S]*?<\/mensajes>/g);
      const clean = msgs ? msgs.map(m => m.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : [];
      const estado = r.rawResponse?.match(/<estado>([^<]+)<\/estado>/)?.[1];
      const numComp = r.rawResponse?.match(/<numeroComprobantes>([^<]+)<\/numeroComprobantes>/)?.[1];
      console.log(`    [${r.tipo}] estado=${estado} numComp=${numComp}`);
      clean.forEach(m => console.log(`      MSG: ${m.slice(0, 300)}`));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
