import forge from "node-forge";
import { create } from "xmlbuilder2";
import type { XAdESSignatureConfig } from "@/types";

/**
 * Signs an XML document using XAdES-BES format as required by SRI Ecuador.
 *
 * Process:
 * 1. Load the P12 certificate and extract private key + certificate chain
 * 2. Compute SHA-1 digest of the XML document
 * 3. Build the ds:SignedInfo element
 * 4. Sign the SignedInfo with RSA-SHA1
 * 5. Add XAdES qualifying properties (xades:QualifyingProperties)
 * 6. Return the signed XML
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

  // ── 3. Compute digest of the document ────────────────────────────────────
  const docDigest = digestSHA1(xmlContent);

  // ── 4. Get certificate data ───────────────────────────────────────────────
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
  const certBase64 = forge.util.encode64(certDer);
  const certDigest = digestSHA1(certDer);

  const issuerName = getRFC2253Name(certificate.issuer as { attributes: { shortName?: string; value: string }[] });
  const serialNumber = certificate.serialNumber.replace(/^0+/, "");

  const signingTime = new Date().toISOString();

  // ── 5. Build SignedInfo ───────────────────────────────────────────────────
  const signedInfoXml = buildSignedInfo(
    signatureId,
    signedPropertiesId,
    keyInfoId,
    referenceId,
    docDigest,
    xmlContent
  );

  // ── 6. Sign the SignedInfo ────────────────────────────────────────────────
  const md = forge.md.sha1.create();
  md.update(signedInfoXml, "utf8");
  const signature = privateKey.sign(md);
  const signatureBase64 = forge.util.encode64(signature);

  // ── 7. Build the complete signed XML ─────────────────────────────────────
  return buildSignedXML({
    originalXml: xmlContent,
    signatureId,
    signedPropertiesId,
    keyInfoId,
    signatureValueId,
    referenceId,
    docDigest,
    certBase64,
    certDigest,
    issuerName,
    serialNumber,
    signingTime,
    signedInfoXml,
    signatureBase64,
  });
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function digestSHA1(content: string): string {
  const md = forge.md.sha1.create();
  md.update(content, "utf8");
  return forge.util.encode64(md.digest().bytes());
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

function buildSignedInfo(
  signatureId: string,
  signedPropertiesId: string,
  keyInfoId: string,
  referenceId: string,
  docDigest: string,
  _xmlContent: string
): string {
  const xadesRef = `#${signedPropertiesId}`;
  const keyRef = `#${keyInfoId}`;

  return `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
    `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
    `<ds:Reference Id="${referenceId}" URI="">` +
    `<ds:Transforms>` +
    `<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
    `</ds:Transforms>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
    `<ds:DigestValue>${docDigest}</ds:DigestValue>` +
    `</ds:Reference>` +
    `<ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="${xadesRef}">` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
    `<ds:DigestValue>${docDigest}</ds:DigestValue>` +
    `</ds:Reference>` +
    `</ds:SignedInfo>`;
}

interface SignedXMLParams {
  originalXml: string;
  signatureId: string;
  signedPropertiesId: string;
  keyInfoId: string;
  signatureValueId: string;
  referenceId: string;
  docDigest: string;
  certBase64: string;
  certDigest: string;
  issuerName: string;
  serialNumber: string;
  signingTime: string;
  signedInfoXml: string;
  signatureBase64: string;
}

function buildSignedXML(p: SignedXMLParams): string {
  // Strip XML declaration from original if present
  const xmlBody = p.originalXml.replace(/<\?xml[^?]*\?>\s*/i, "");

  const signatureBlock = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${p.signatureId}">
  ${p.signedInfoXml}
  <ds:SignatureValue Id="${p.signatureValueId}">${p.signatureBase64}</ds:SignatureValue>
  <ds:KeyInfo Id="${p.keyInfoId}">
    <ds:X509Data>
      <ds:X509Certificate>${p.certBase64}</ds:X509Certificate>
    </ds:X509Data>
    <ds:KeyValue>
      <ds:RSAKeyValue>
        <ds:Modulus></ds:Modulus>
        <ds:Exponent></ds:Exponent>
      </ds:RSAKeyValue>
    </ds:KeyValue>
  </ds:KeyInfo>
  <ds:Object Id="xades-${p.signatureId}">
    <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#${p.signatureId}">
      <xades:SignedProperties Id="${p.signedPropertiesId}">
        <xades:SignedSignatureProperties>
          <xades:SigningTime>${p.signingTime}</xades:SigningTime>
          <xades:SigningCertificate>
            <xades:Cert>
              <xades:CertDigest>
                <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
                <ds:DigestValue>${p.certDigest}</ds:DigestValue>
              </xades:CertDigest>
              <xades:IssuerSerial>
                <ds:X509IssuerName>${p.issuerName}</ds:X509IssuerName>
                <ds:X509SerialNumber>${p.serialNumber}</ds:X509SerialNumber>
              </xades:IssuerSerial>
            </xades:Cert>
          </xades:SigningCertificate>
          <xades:SignaturePolicyIdentifier>
            <xades:SignaturePolicyImplied/>
          </xades:SignaturePolicyIdentifier>
        </xades:SignedSignatureProperties>
      </xades:SignedProperties>
    </xades:QualifyingProperties>
  </ds:Object>
</ds:Signature>`;

  // Inject signature before the closing tag of the root element
  return xmlBody.replace(/(<\/[^>]+>\s*)$/, `${signatureBlock}\n$1`);
}
