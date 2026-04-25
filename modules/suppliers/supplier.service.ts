import { supplierRepository, CreateSupplierDTO, UpdateSupplierDTO } from "./supplier.repository";

export const supplierService = {
  getAll(companyId: string, search?: string) {
    return supplierRepository.findAll(companyId, search);
  },

  getById(id: string, companyId: string) {
    return supplierRepository.findById(id, companyId);
  },

  create(data: CreateSupplierDTO) {
    return supplierRepository.create(data);
  },

  update(id: string, companyId: string, data: UpdateSupplierDTO) {
    return supplierRepository.update(id, companyId, data);
  },

  delete(id: string, companyId: string) {
    return supplierRepository.delete(id, companyId);
  },
};
