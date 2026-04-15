import { productRepository } from "./product.repository";
import type { CreateProductDTO } from "@/types";

export const productService = {
  async getAll(companyId: string, search?: string) {
    return productRepository.findAll(companyId, search);
  },

  async getById(id: string, companyId: string) {
    const product = await productRepository.findById(id, companyId);
    if (!product) throw new Error("Producto no encontrado");
    return product;
  },

  async create(companyId: string, dto: CreateProductDTO) {
    const existing = await productRepository.findByCodigo(
      companyId,
      dto.codigoPrincipal
    );
    if (existing) {
      throw new Error(
        `Ya existe un producto con código ${dto.codigoPrincipal}`
      );
    }
    return productRepository.create(companyId, dto);
  },

  async update(id: string, companyId: string, dto: Partial<CreateProductDTO>) {
    await productService.getById(id, companyId);
    return productRepository.update(id, dto);
  },

  async delete(id: string, companyId: string) {
    await productService.getById(id, companyId);
    return productRepository.softDelete(id);
  },
};
