-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYED');

-- CreateEnum
CREATE TYPE "Ambiente" AS ENUM ('PRUEBAS', 'PRODUCCION');

-- CreateEnum
CREATE TYPE "TipoIdentificacion" AS ENUM ('CEDULA', 'RUC', 'PASAPORTE', 'CONSUMIDOR_FINAL');

-- CreateEnum
CREATE TYPE "TipoIVA" AS ENUM ('IVA_0', 'IVA_5', 'IVA_STANDARD', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "TipoProducto" AS ENUM ('BIEN', 'SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoComprobante" AS ENUM ('PENDIENTE', 'ENVIADO', 'DEVUELTA', 'AUTORIZADO', 'RECHAZADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoEmision" AS ENUM ('NORMAL', 'INDISPONIBILIDAD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "dirMatriz" TEXT NOT NULL,
    "estab" CHAR(3) NOT NULL,
    "ptoEmi" CHAR(3) NOT NULL,
    "contribuyenteEsp" TEXT,
    "obligadoContab" BOOLEAN NOT NULL DEFAULT false,
    "ambiente" "Ambiente" NOT NULL DEFAULT 'PRUEBAS',
    "tipoEmision" "TipoEmision" NOT NULL DEFAULT 'NORMAL',
    "logoUrl" TEXT,
    "secuencialInicio" INTEGER NOT NULL DEFAULT 1,
    "codigoNumericoSiguiente" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileData" BYTEA NOT NULL,
    "password" TEXT NOT NULL,
    "thumbprint" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tipoIdentif" "TipoIdentificacion" NOT NULL DEFAULT 'CEDULA',
    "identificacion" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "direccion" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "codigoPrincipal" TEXT NOT NULL,
    "codigoAuxiliar" TEXT,
    "descripcion" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "tipoIva" "TipoIVA" NOT NULL DEFAULT 'IVA_STANDARD',
    "tipo" "TipoProducto" NOT NULL DEFAULT 'BIEN',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "secuencial" CHAR(9) NOT NULL,
    "claveAcceso" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal0" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal12" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal5" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal15" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotalNoIva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDescuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalIva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "propina" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "importeTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "branchId" TEXT,
    "formaPago" TEXT NOT NULL DEFAULT '01',
    "montoPagado" DECIMAL(12,2),
    "vuelto" DECIMAL(12,2),
    "estado" "EstadoComprobante" NOT NULL DEFAULT 'PENDIENTE',
    "xmlGenerado" TEXT,
    "xmlFirmado" TEXT,
    "xmlAutorizado" TEXT,
    "numeroAutorizacion" TEXT,
    "fechaAutorizacion" TIMESTAMP(3),
    "ambiente" "Ambiente" NOT NULL,
    "observaciones" TEXT,
    "motivoAnulacion" TEXT,
    "fechaAnulacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_details" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "codigoPrincipal" TEXT NOT NULL,
    "codigoAuxiliar" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(12,6) NOT NULL,
    "precioUnitario" DECIMAL(12,6) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "precioTotalSinImpuesto" DECIMAL(12,2) NOT NULL,
    "tipoIva" "TipoIVA" NOT NULL DEFAULT 'IVA_STANDARD',
    "valorIva" DECIMAL(12,2) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sri_responses" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "mensaje" TEXT,
    "informacion" TEXT,
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sri_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE INDEX "users_branchId_idx" ON "users"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_ruc_key" ON "companies"("ruc");

-- CreateIndex
CREATE INDEX "companies_ruc_idx" ON "companies"("ruc");

-- CreateIndex
CREATE INDEX "branches_companyId_idx" ON "branches"("companyId");

-- CreateIndex
CREATE INDEX "certificates_companyId_idx" ON "certificates"("companyId");

-- CreateIndex
CREATE INDEX "clients_companyId_idx" ON "clients"("companyId");

-- CreateIndex
CREATE INDEX "clients_identificacion_idx" ON "clients"("identificacion");

-- CreateIndex
CREATE UNIQUE INDEX "clients_companyId_identificacion_key" ON "clients"("companyId", "identificacion");

-- CreateIndex
CREATE INDEX "products_companyId_idx" ON "products"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "products_companyId_codigoPrincipal_key" ON "products"("companyId", "codigoPrincipal");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_claveAcceso_key" ON "invoices"("claveAcceso");

-- CreateIndex
CREATE INDEX "invoices_companyId_idx" ON "invoices"("companyId");

-- CreateIndex
CREATE INDEX "invoices_clientId_idx" ON "invoices"("clientId");

-- CreateIndex
CREATE INDEX "invoices_estado_idx" ON "invoices"("estado");

-- CreateIndex
CREATE INDEX "invoices_claveAcceso_idx" ON "invoices"("claveAcceso");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_companyId_secuencial_key" ON "invoices"("companyId", "secuencial");

-- CreateIndex
CREATE INDEX "invoice_details_invoiceId_idx" ON "invoice_details"("invoiceId");

-- CreateIndex
CREATE INDEX "sri_responses_invoiceId_idx" ON "sri_responses"("invoiceId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_details" ADD CONSTRAINT "invoice_details_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_details" ADD CONSTRAINT "invoice_details_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sri_responses" ADD CONSTRAINT "sri_responses_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
