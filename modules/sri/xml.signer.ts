import forge from "node-forge";
import type { XAdESSignatureConfig } from "@/types";

/**
 * Signs an XML document using XAdES-BES format as required by SRI Ecuador.
 *
 * Signature structure:
 *  ds:Signature
 *    ds:SignedInfo
 *      ds:Reference URI="#comprobante"  ← digest of the <factura> element
 *      ds:Reference URI="#SignedProps"  ← digest of xades:SignedProperties
 *    ds:SignatureValue                  ← RSA-SHA1 of canonicalized SignedInfo
 *    ds:KeyInfo                         ← X509 cert + RSA public key
 *    ds:Object
 *      xades:QualifyingProperties
 *        xades:SignedProperties         ← signing time + cert digest
 */
export function signXML(config: XAdESSignatureConfig): string {
  const { certificateData, certificatePassword, xmlContent } = config;

  // ── 1. Load P12 certificate ───────────────────────────────────────────────
  const p12Asn1 = forge.asn1.fromDer(certificateData.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, certificatePassword);

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  const certBag = certBags[forge.pki.oids.certBag]?.[0];

  if (!keyBag?.key) throw new Error("No se pudo extraer la clave privada del certificado");
  if (!certBag?.cert) throw new Error("No se pudo extraer el certificado");

  const privateKey = keyBag.key as forge.pki.rsa.PrivateKey;
  const certificate = certBag.cert;

  // ── 2. Prepare IDs ────────────────────────────────────────────────────────
  const signatureId = `Signature-${randomId()}`;
  const signedPropertiesId = `SignedProperties-${signatureId}`;
  const keyInfoId = `KeyInfo-${signatureId}`;
  const signatureValueId = `SignatureValue-${signatureId}`;
  const referenceId = `Reference-${signatureId}`;

  // ── 3. Certificate data ───────────────────────────────────────────────────
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
  const certBase64 = forge.util.encode64(certDer);
  // Digest of certificate DER bytes (binary — no UTF-8 encoding)
  const certDigest = digestSHA1Binary(certDer);

  const issuerName = getRFC2253Name(
    certificate.issuer as { attributes: { shortName?: string; value: string }[] }
  );
  // Serial number: convert hex to decimal (BigInt) as required by XAdES
  const serialNumber = BigInt("0x" + certificate.serialNumber).toString(10);
  const signingTime = new Date().toISOString();

  // RSA public key components (base64 of big-endian bytes, no DER sign-extension byte)
  const pubKey = certificate.publicKey as forge.pki.rsa.PublicKey;
  const modulus = bigIntToBase64(pubKey.n.toString(16));
  const exponent = bigIntToBase64(pubKey.e.toString(16));

  // ── 4. Strip XML declaration — docBody IS the #comprobante element ────────
  // The enveloped-signature transform removes <ds:Signature> before verifying,
  // but since we compute the digest BEFORE adding the signature, docBody is
  // already the clean content the SRI will verify against.
  const docBody = xmlContent.replace(/<\?xml[^?]*\?>\s*/i, "");

  // ── 5. Digest of #comprobante (UTF-8 bytes of the element) ───────────────
  const docDigest = digestSHA1UTF8(docBody);

  // ── 6. Build xades:SignedProperties ──────────────────────────────────────
  // Must include xmlns:ds and xmlns:xades explicitly because when the SRI
  // canonicalizes this element from the complete document, those namespaces are
  // in scope from ancestor elements and will appear in the canonical form.
  const signedPropsXml =
    `<xades:SignedProperties` +
    ` xmlns:ds="http://www.w3.org/2000/09/xmldsig#"` +
    ` xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"` +
    ` Id="${signedPropertiesId}">` +
    `<xades:SignedSignatureProperties>` +
    `<xades:SigningTime>${signingTime}</xades:SigningTime>` +
    `<xades:SigningCertificate>` +
    `<xades:Cert>` +
    `<xades:CertDigest>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>` +
    `<ds:DigestValue>${certDigest}</ds:DigestValue>` +
    `</xades:CertDigest>` +
    `<xades:IssuerSerial>` +
    `<ds:X509IssuerName>${escapeXml(issuerName)}</ds:X509IssuerName>` +
    `<ds:X509SerialNumber>${serialNumber}</ds:X509SerialNumber>` +
    `</xades:IssuerSerial>` +
    `</xades:Cert>` +
    `</xades:SigningCertificate>` +
    `<xades:SignaturePolicyIdentifier>` +
    `<xades:SignaturePolicyImplied></xades:SignaturePolicyImplied>` +
    `</xades:SignaturePolicyIdentifier>` +
    `</xades:SignedSignatureProperties>` +
    `</xades:SignedProperties>`;

  // ── 7. Digest of SignedProperties (UTF-8 bytes) ───────────────────────────
  const signedPropsDigest = digestSHA1UTF8(signedPropsXml);

  // ── 8. Build SignedInfo ───────────────────────────────────────────────────
  // IMPORTANT:
  //   - URI="#comprobante" — signs the <factura id="comprobante"> element
  //   - Each Reference has its OWN distinct DigestValue (docDigest ≠ signedPropsDigest)
  //   - NO xmlns:ds here: the SRI verifier applies C14N to ds:SignedInfo from within the
  //     document where xmlns:ds is already declared on the parent ds:Signature.
  //     C14N omits redundant namespace declarations, so we must sign the element
  //     WITHOUT xmlns:ds to match the canonical bytes the verifier will compute.
  // C14N (Canonical XML 1.0) requirements for the string we sign:
  //   1. xmlns:ds MUST be present — C14N for the APEX element of a subset renders ALL
  //      in-scope namespace declarations, even those already declared on an ancestor
  //      that is outside the subset being canonicalized.
  //   2. Self-closing tags MUST be expanded — C14N always emits explicit open/close form.
  const signedInfoXml =
    `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
    `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></ds:CanonicalizationMethod>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></ds:SignatureMethod>` +
    `<ds:Reference Id="${referenceId}" URI="#comprobante">` +
    `<ds:Transforms>` +
    `<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></ds:Transform>` +
    `</ds:Transforms>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>` +
    `<ds:DigestValue>${docDigest}</ds:DigestValue>` +
    `</ds:Reference>` +
    `<ds:Reference Type="http://uri.etsi.org/01903#SignedProperties"` +
    ` URI="#${signedPropertiesId}">` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>` +
    `<ds:DigestValue>${signedPropsDigest}</ds:DigestValue>` +
    `</ds:Reference>` +
    `</ds:SignedInfo>`;

  // ── 9. Sign the SignedInfo (RSA-SHA1 of the UTF-8 bytes) ──────────────────
  const md = forge.md.sha1.create();
  md.update(signedInfoXml, "utf8");
  const signatureBytes = privateKey.sign(md);
  const signatureBase64 = forge.util.encode64(signatureBytes);

  // ── 10. Assemble the complete ds:Signature block ──────────────────────────
  const signatureBlock =
    `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signatureId}">` +
    signedInfoXml +
    `<ds:SignatureValue Id="${signatureValueId}">${signatureBase64}</ds:SignatureValue>` +
    `<ds:KeyInfo Id="${keyInfoId}">` +
    `<ds:X509Data>` +
    `<ds:X509Certificate>${certBase64}</ds:X509Certificate>` +
    `</ds:X509Data>` +
    `<ds:KeyValue>` +
    `<ds:RSAKeyValue>` +
    `<ds:Modulus>${modulus}</ds:Modulus>` +
    `<ds:Exponent>${exponent}</ds:Exponent>` +
    `</ds:RSAKeyValue>` +
    `</ds:KeyValue>` +
    `</ds:KeyInfo>` +
    `<ds:Object Id="xades-${signatureId}">` +
    `<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"` +
    ` Target="#${signatureId}">` +
    signedPropsXml +
    `</xades:QualifyingProperties>` +
    `</ds:Object>` +
    `</ds:Signature>`;

  // ── 11. Inject signature before the closing tag of the root element ───────
  return docBody.replace(/(<\/[^>]+>\s*)$/, `${signatureBlock}\n$1`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** SHA-1 digest of a UTF-8 text string → base64 */
function digestSHA1UTF8(text: string): string {
  const md = forge.md.sha1.create();
  md.update(text, "utf8");
  return forge.util.encode64(md.digest().bytes());
}

/** SHA-1 digest of a forge binary string (raw bytes) → base64 */
function digestSHA1Binary(binaryStr: string): string {
  const md = forge.md.sha1.create();
  md.update(binaryStr); // no encoding = raw binary
  return forge.util.encode64(md.digest().bytes());
}

/** Converts a hex string (big-endian integer) to base64 (no DER sign-extension byte) */
function bigIntToBase64(hex: string): string {
  const padded = hex.length % 2 === 0 ? hex : "0" + hex;
  return forge.util.encode64(forge.util.hexToBytes(padded));
}

function randomId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function getRFC2253Name(name: { attributes: { shortName?: string; value: string }[] }): string {
  return name.attributes
    .map((attr) => `${attr.shortName ?? ""}=${attr.value}`)
    .reverse()
    .join(",");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
