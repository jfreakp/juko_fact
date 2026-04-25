import { purchaseRepository, CreatePurchaseDTO } from "./purchase.repository";

export const purchaseService = {
  getAll(
    companyId: string,
    opts?: { from?: Date; to?: Date; supplierId?: string; branchId?: string }
  ) {
    return purchaseRepository.findAll(companyId, opts);
  },

  getById(id: string, companyId: string) {
    return purchaseRepository.findById(id, companyId);
  },

  create(data: CreatePurchaseDTO) {
    return purchaseRepository.create(data);
  },
};
