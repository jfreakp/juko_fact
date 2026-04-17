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
  
  const xml = inv.xmlFirmado || "";
  const gen = inv.xmlGenerado || "";
  
  // Show the last 200 chars of xmlGenerado
  const docBody = gen.replace(/<\?xml[^?]*\?>\s*/i, "");
  console.log("=== docBody last 100 chars (hex) ===");
  const endBytes = Buffer.from(docBody.slice(-100));
  console.log(endBytes.toString('hex').match(/../g).join(' '));
  console.log(JSON.stringify(docBody.slice(-50)));
  
  // Find what's around ds:Signature in the full signed XML
  const sigStart = xml.indexOf('<ds:Signature');
  const sigEnd = xml.indexOf('</ds:Signature>') + '</ds:Signature>'.length;
  const beforeSig = xml.slice(Math.max(0, sigStart - 30), sigStart);
  const afterSig = xml.slice(sigEnd, Math.min(xml.length, sigEnd + 50));
  console.log("\n=== Context around ds:Signature ===");
  console.log("Before:", JSON.stringify(beforeSig));
  console.log("After:", JSON.stringify(afterSig));
  
  // What docBody produces after enveloped signature removal
  // Remove ds:Signature from xml
  const withoutSig = xml.slice(0, sigStart) + xml.slice(sigEnd);
  console.log("\n=== Content near end after removing ds:Signature ===");
  console.log(JSON.stringify(withoutSig.slice(-80)));
}

main().catch(console.error).finally(() => prisma.$disconnect());
