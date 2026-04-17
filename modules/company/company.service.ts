import { companyRepository } from "./company.repository";
import type { UpdateCompanyDTO } from "@/types";
import forge from "node-forge";

export const companyService = {
  async getCompany(companyId: string) {
    const company = await companyRepository.findById(companyId);
    if (!company) throw new Error("Empresa no encontrada");
    return company;
  },

  async updateCompany(companyId: string, dto: UpdateCompanyDTO) {
    return companyRepository.update(companyId, dto);
  },

  async uploadCertificate(
    companyId: string,
    fileBuffer: Buffer,
    fileName: string,
    password: string
  ) {
    // Validate P12 certificate
    let certInfo: { thumbprint: string; validFrom: Date; validTo: Date } | undefined;

    try {
      const p12Asn1 = forge.asn1.fromDer(fileBuffer.toString("binary"));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag]?.[0];

      if (certBag?.cert) {
        const cert = certBag.cert;
        const fingerprint = forge.md.sha1
          .create()
          .update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes())
          .digest()
          .toHex()
          .toUpperCase();

        certInfo = {
          thumbprint: fingerprint,
          validFrom: cert.validity.notBefore,
          validTo: cert.validity.notAfter,
        };
      }
    } catch {
      throw new Error(
        "Certificado inválido o contraseña incorrecta. Verifique el archivo .p12 y la contraseña."
      );
    }

    return companyRepository.upsertCertificate(companyId, {
      fileName,
      fileData: fileBuffer,
      password,
      ...certInfo,
    });
  },

  async getActiveCertificate(companyId: string) {
    const cert = await companyRepository.getActiveCertificate(companyId);
    if (!cert) throw new Error("No hay certificado digital activo para esta empresa");
    return cert;
  },
};
