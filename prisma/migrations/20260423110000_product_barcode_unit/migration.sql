-- CreateEnum
CREATE TYPE "UnidadMedida" AS ENUM ('UNIDAD', 'KG', 'LITRO', 'METRO', 'M2', 'CAJA');

-- AlterTable: add codigoBarras and unidadMedida to products
ALTER TABLE "products"
  ADD COLUMN "codigoBarras"  TEXT,
  ADD COLUMN "unidadMedida"  "UnidadMedida" NOT NULL DEFAULT 'UNIDAD';

-- CreateIndex: fast barcode lookup
CREATE INDEX "products_codigoBarras_idx" ON "products"("codigoBarras");
