import { branchRepository } from "./branch.repository";
import type { CreateBranchDTO, UpdateBranchDTO } from "@/types";

export const branchService = {
  async getAll(companyId: string) {
    return branchRepository.findAll(companyId);
  },

  async getById(id: string, companyId: string) {
    const branch = await branchRepository.findById(id, companyId);
    if (!branch) throw new Error("Sucursal no encontrada");
    return branch;
  },

  async create(companyId: string, dto: CreateBranchDTO) {
    if (!dto.nombre?.trim()) throw new Error("El nombre de la sucursal es requerido");
    return branchRepository.create(companyId, dto);
  },

  async update(id: string, companyId: string, dto: UpdateBranchDTO) {
    const existing = await branchRepository.findById(id, companyId);
    if (!existing) throw new Error("Sucursal no encontrada");
    await branchRepository.update(id, companyId, dto);
    return branchRepository.findById(id, companyId);
  },

  async delete(id: string, companyId: string) {
    const existing = await branchRepository.findById(id, companyId);
    if (!existing) throw new Error("Sucursal no encontrada");
    await branchRepository.delete(id, companyId);
  },
};
