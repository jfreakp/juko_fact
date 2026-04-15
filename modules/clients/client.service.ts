import { clientRepository } from "./client.repository";
import type { CreateClientDTO } from "@/types";

export const clientService = {
  async getAll(companyId: string, search?: string) {
    return clientRepository.findAll(companyId, search);
  },

  async getById(id: string, companyId: string) {
    const client = await clientRepository.findById(id, companyId);
    if (!client) throw new Error("Cliente no encontrado");
    return client;
  },

  async create(companyId: string, dto: CreateClientDTO) {
    const existing = await clientRepository.findByIdentificacion(
      companyId,
      dto.identificacion
    );
    if (existing) {
      throw new Error(
        `Ya existe un cliente con identificación ${dto.identificacion}`
      );
    }
    return clientRepository.create(companyId, dto);
  },

  async update(id: string, companyId: string, dto: Partial<CreateClientDTO>) {
    await clientService.getById(id, companyId);
    return clientRepository.update(id, companyId, dto);
  },

  async delete(id: string, companyId: string) {
    await clientService.getById(id, companyId);
    return clientRepository.softDelete(id, companyId);
  },
};
