import { prisma } from "@/lib/prisma";
import type { UpdateCompanyDTO } from "@/types";

export const companyRepository = {
  async findById(id: string) {
    return prisma.company.findUnique({
      where: { id },
      include: {
        certificates: {
          where: { active: true },
          select: {
            id: true,
            fileName: true,
            validFrom: true,
            validTo: true,
            thumbprint: true,
            active: true,
          },
        },
      },
    });
  },

  async findByRuc(ruc: string) {
    return prisma.company.findUnique({ where: { ruc } });
  },

  async create(data: {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    dirMatriz: string;
    estab: string;
    ptoEmi: string;
    ambiente?: "PRUEBAS" | "PRODUCCION";
  }) {
    return prisma.company.create({ data });
  },

  async update(id: string, data: UpdateCompanyDTO) {
    return prisma.company.update({ where: { id }, data });
  },

  async upsertCertificate(
    companyId: string,
    data: {
      fileName: string;
      fileData: Buffer;
      password: string;
      thumbprint?: string;
      validFrom?: Date;
      validTo?: Date;
    }
  ) {
    // Deactivate old certificates
    await prisma.certificate.updateMany({
      where: { companyId, active: true },
      data: { active: false },
    });

    return prisma.certificate.create({
      data: { companyId, ...data, active: true } as never,
    });
  },

  async getActiveCertificate(companyId: string) {
    return prisma.certificate.findFirst({
      where: { companyId, active: true },
    });
  },

  /**
   * Atomically increments and returns the next codigoNumerico for a company.
   * This 8-digit sequential number is part of the SRI claveAcceso (positions 40-47).
   * Using Prisma's atomic increment prevents collisions under concurrent requests.
   */
  async getNextCodigoNumerico(companyId: string): Promise<string> {
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { codigoNumericoSiguiente: { increment: 1 } },
      select: { codigoNumericoSiguiente: true },
    });
    // Return the value BEFORE increment (subtract 1), zero-padded to 8 digits
    return (updated.codigoNumericoSiguiente - 1).toString().padStart(8, "0");
  },
};
