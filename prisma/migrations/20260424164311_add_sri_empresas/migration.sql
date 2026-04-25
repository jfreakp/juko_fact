-- CreateTable
CREATE TABLE "sri_empresas" (
    "id" TEXT NOT NULL,
    "ruc" CHAR(13) NOT NULL,
    "razonSocial" TEXT,
    "nombreComercial" TEXT,
    "claseContribuyente" TEXT,
    "tipoContribuyente" TEXT,
    "estadoContribuyenteRuc" TEXT,
    "fechaInicioActividades" TEXT,
    "fechaActualizacion" TEXT,
    "fechaSuspensionDefinitiva" TEXT,
    "fechaReinicioActividades" TEXT,
    "actividadEconomicaPrincipal" TEXT,
    "obligadoContabilidad" TEXT,
    "agenteRetencion" TEXT,
    "contribuyenteEspecial" TEXT,
    "establecimientoDireccion" TEXT,
    "establecimientoEstado" TEXT,
    "establecimientoDescripcion" TEXT,
    "htmlRaw" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sri_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sri_empresas_ruc_key" ON "sri_empresas"("ruc");

-- CreateIndex
CREATE INDEX "sri_empresas_ruc_idx" ON "sri_empresas"("ruc");
