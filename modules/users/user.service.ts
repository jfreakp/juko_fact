import bcrypt from "bcryptjs";
import { userRepository } from "./user.repository";
import type { CreateUserDTO, UpdateUserDTO } from "@/types";

export const userService = {
  async getAll(companyId: string) {
    return userRepository.findAll(companyId);
  },

  async getById(id: string, companyId: string) {
    const user = await userRepository.findById(id, companyId);
    if (!user) throw new Error("Usuario no encontrado");
    return user;
  },

  async create(companyId: string, dto: Omit<CreateUserDTO, "companyId">) {
    if (!dto.email?.trim()) throw new Error("El email es requerido");
    if (!dto.password || dto.password.length < 6)
      throw new Error("La contraseña debe tener al menos 6 caracteres");

    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw new Error("El email ya está registrado");

    const hashed = await bcrypt.hash(dto.password, 12);
    return userRepository.create(companyId, { ...dto, password: hashed });
  },

  async update(id: string, companyId: string, dto: UpdateUserDTO) {
    const existing = await userRepository.findById(id, companyId);
    if (!existing) throw new Error("Usuario no encontrado");

    const data: UpdateUserDTO = { ...dto };
    if (dto.password) {
      if (dto.password.length < 6)
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      data.password = await bcrypt.hash(dto.password, 12);
    } else {
      delete data.password;
    }

    await userRepository.update(id, companyId, data);
    return userRepository.findById(id, companyId);
  },

  async deactivate(id: string, companyId: string, requesterId: string) {
    if (id === requesterId) throw new Error("No puedes desactivar tu propio usuario");
    const existing = await userRepository.findById(id, companyId);
    if (!existing) throw new Error("Usuario no encontrado");
    await userRepository.delete(id, companyId);
  },
};
