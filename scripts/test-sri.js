// @ts-check
const http = require("http");

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const cookies = res.headers["set-cookie"] || [];
        resolve({ status: res.statusCode, data: JSON.parse(data), cookies });
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const BASE = "localhost";
  const PORT = 3000;

  // 1. Login
  console.log("1. Login...");
  const login = await request(
    {
      hostname: BASE, port: PORT, path: "/api/auth/login", method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: "admin@empresa.com", password: "admin123" }
  );
  if (!login.data.success) throw new Error("Login failed: " + JSON.stringify(login.data));
  const cookie = login.cookies.map((c) => c.split(";")[0]).join("; ");
  console.log("   OK, companyId:", login.data.data?.user?.companyId);

  // 2. Get a client
  console.log("2. Get client...");
  const clients = await request({
    hostname: BASE, port: PORT, path: "/api/clients", method: "GET",
    headers: { Cookie: cookie },
  });
  // API returns array directly or {items:[...]}
  const clientList = Array.isArray(clients.data.data) ? clients.data.data : clients.data.data?.items;
  const clientId = clientList?.[0]?.id;
  if (!clientId) throw new Error("No clients: " + JSON.stringify(clients.data));
  console.log("   ClientId:", clientId, clients.data.data?.items?.[0]?.razonSocial);

  // 3. Create invoice
  console.log("3. Create invoice...");
  const inv = await request(
    {
      hostname: BASE, port: PORT, path: "/api/invoices", method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
    },
    {
      clientId,
      details: [{
        codigoPrincipal: "TEST001",
        descripcion: "Prueba facturacion electronica",
        cantidad: 1,
        precioUnitario: 10.0,
        tipoIva: "IVA_15",
      }],
    }
  );
  if (!inv.data.success) throw new Error("Create invoice failed: " + JSON.stringify(inv.data));
  const invoiceId = inv.data.data?.id;
  const secuencial = inv.data.data?.secuencial;
  console.log("   Created:", invoiceId, "secuencial:", secuencial);

  // 4. Send to SRI (may take up to 20s due to retry logic)
  console.log("4. Sending to SRI (up to 20s with retries)...");
  const start = Date.now();
  const sri = await request(
    {
      hostname: BASE, port: PORT, path: "/api/sri/send", method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
    },
    { invoiceId }
  );
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`   Took ${elapsed}s`);
  console.log("5. Result:", JSON.stringify(sri.data, null, 2));
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
