import { cxcRepository } from "./cxc.repository";

export const cxcService = {
  async getAll(
    companyId: string,
    opts?: { estado?: string; clientId?: string; page?: number; limit?: number }
  ) {
    return cxcRepository.findAll(companyId, opts);
  },

  async getById(id: string, companyId: string) {
    const cxc = await cxcRepository.findById(id, companyId);
    if (!cxc) throw new Error("Cuenta por cobrar no encontrada");
    return cxc;
  },

  async registrarAbono(
    cxcId: string,
    companyId: string,
    abono: {
      monto: number;
      formaPago: string;
      notas?: string;
      userId?: string;
      fecha?: Date;
    }
  ) {
    return cxcRepository.registrarAbono(cxcId, companyId, abono);
  },

  async getStats(companyId: string) {
    return cxcRepository.getStats(companyId);
  },
};
