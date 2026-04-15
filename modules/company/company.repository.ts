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
};
