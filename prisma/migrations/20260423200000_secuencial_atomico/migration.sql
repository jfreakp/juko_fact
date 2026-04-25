-- AddColumn: contador atómico de secuencial por empresa
-- F-03: Reemplaza el patrón findFirst+create (race condition) por UPDATE atómico.

ALTER TABLE "companies" ADD COLUMN "secuencialSiguiente" INTEGER NOT NULL DEFAULT 1;

-- Inicializar desde el mayor secuencial existente por empresa.
-- GREATEST asegura que nunca quede por debajo de secuencialInicio.
UPDATE "companies" c
SET "secuencialSiguiente" = GREATEST(
  c."secuencialInicio",
  COALESCE(
    (
      SELECT MAX(CAST(i."secuencial" AS INTEGER)) + 1
      FROM "invoices" i
      WHERE i."companyId" = c.id
    ),
    c."secuencialInicio"
  )
);
