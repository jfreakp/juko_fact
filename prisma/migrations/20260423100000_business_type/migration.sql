-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('GENERAL', 'PHARMACY', 'LIQUOR_STORE', 'GROCERY', 'RESTAURANT', 'CLOTHING_STORE', 'HARDWARE_STORE');

-- AlterTable: add businessType to companies
ALTER TABLE "companies" ADD COLUMN "businessType" "BusinessType" NOT NULL DEFAULT 'GENERAL';

-- AlterTable: add metadata JSON to products
ALTER TABLE "products" ADD COLUMN "metadata" JSONB;
