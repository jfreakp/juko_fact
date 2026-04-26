/*
  Warnings:

  - You are about to drop the column `formaPago` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `montoPagado` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `vuelto` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "formaPago",
DROP COLUMN "montoPagado",
DROP COLUMN "vuelto";

-- CreateTable
CREATE TABLE "invoice_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "formaPago" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "plazo" INTEGER,
    "unidadTiempo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_payments_invoiceId_idx" ON "invoice_payments"("invoiceId");

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
