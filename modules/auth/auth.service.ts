import bcrypt from "bcryptjs";
import { authRepository } from "./auth.repository";
import { signToken, type JWTPayload } from "@/lib/auth";
import type { LoginDTO, CreateUserDTO } from "@/types";

export const authService = {
  async login(dto: LoginDTO): Promise<{ token: string; user: JWTPayload }> {
    const user = await authRepository.findByEmail(dto.email);
    if (!user || !user.active) {
      throw new Error("Credenciales inválidas");
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new Error("Credenciales inválidas");
    }

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      branchId: user.branchId ?? null,
    };

    const token = signToken(payload);
    return { token, user: payload };
  },

  async register(dto: CreateUserDTO) {
    const existing = await authRepository.findByEmail(dto.email);
    if (existing) {
      throw new Error("El email ya está registrado");
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await authRepository.create({ ...dto, password: hashed });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },

  async me(userId: string) {
    const user = await authRepository.findByIdWithCompany(userId);
    if (!user) throw new Error("Usuario no encontrado");

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      branchId: user.branchId ?? null,
      company: user.company
        ? {
            id: user.company.id,
            ruc: user.company.ruc,
            razonSocial: user.company.razonSocial,
            ambiente: user.company.ambiente,
          }
        : null,
      branch: user.branch
        ? { id: user.branch.id, nombre: user.branch.nombre }
        : null,
    };
  },
};
