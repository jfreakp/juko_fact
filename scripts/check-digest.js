const forge = require("node-forge");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const invoiceId = process.argv[2];
if (!invoiceId) { console.error("Usage: node check-digest.js <invoiceId>"); process.exit(1); }

async function main() {
  const [inv, responses] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: invoiceId }, select: { xmlFirmado: true, xmlGenerado: true } }),
    prisma.sRIResponse.findMany({ where: { invoiceId }, select: { tipo: true, rawResponse: true } }),
  ]);

  // Show SRI error messages
  for (const r of responses) {
    const msgs = r.rawResponse?.match(/<mensajes>[\s\S]*?<\/mensajes>/g);
    if (msgs) {
      console.log("=== " + r.tipo + " errors ===");
      msgs.forEach((m) => console.log(m.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()));
    }
  }

  const xml = inv.xmlFirmado || "";

  // --- Verify #comprobante digest ---
  const docBody = (inv.xmlGenerado || "").replace(/<\?xml[^?]*\?>\s*/i, "");
  const md1 = forge.md.sha1.create();
  md1.update(docBody, "utf8");
  const localDocDigest = forge.util.encode64(md1.digest().bytes());
  const docRefDigest = xml.match(/URI="#comprobante"[\s\S]*?<ds:DigestValue>([^<]+)<\/ds:DigestValue>/)?.[1];
  console.log("\n#comprobante digest");
  console.log("  computed:", localDocDigest);
  console.log("  in xml:  ", docRefDigest);
  console.log("  match:   ", localDocDigest === docRefDigest);

  // --- Verify #SignedProperties digest ---
  const spFull = xml.match(/(<xades:SignedProperties[^>]*>[\s\S]*?<\/xades:SignedProperties>)/)?.[1];
  if (spFull) {
    const md2 = forge.md.sha1.create();
    md2.update(spFull, "utf8");
    const localSpDigest = forge.util.encode64(md2.digest().bytes());
    const spRefDigest = xml.match(/URI="#SignedProperties[^"]*"[\s\S]*?<ds:DigestValue>([^<]+)<\/ds:DigestValue>/)?.[1];
    console.log("\n#SignedProperties digest");
    console.log("  computed:", localSpDigest);
    console.log("  in xml:  ", spRefDigest);
    console.log("  match:   ", localSpDigest === spRefDigest);
    console.log("\n  SignedProperties XML (first 200 chars):\n  ", spFull.slice(0, 200));
  }

  // --- Verify RSA signature ---
  const siMatch = xml.match(/<ds:SignedInfo[^>]*>[\s\S]*?<\/ds:SignedInfo>/)?.[0];
  const svB64 = xml.match(/<ds:SignatureValue[^>]*>([A-Za-z0-9+/=\s]+)<\/ds:SignatureValue>/)?.[1]?.replace(/\s/g, "");
  const certB64 = xml.match(/<ds:X509Certificate>([A-Za-z0-9+/=\s]+)<\/ds:X509Certificate>/)?.[1]?.replace(/\s/g, "");
  if (siMatch && svB64 && certB64) {
    const certDer = forge.util.decode64(certB64);
    const cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(certDer));
    const md3 = forge.md.sha1.create();
    md3.update(siMatch, "utf8");
    try {
      const ok = cert.publicKey.verify(md3.digest().bytes(), forge.util.decode64(svB64));
      console.log("\nRSA signature valid:", ok);
    } catch (e) { console.log("\nRSA verify error:", e.message); }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
