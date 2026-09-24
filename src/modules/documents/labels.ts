import type { DocumentKind } from "@/generated/prisma/enums";

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  LAB_RESULT: "Wyniki badań laboratoryjnych",
  ISCC_CERTIFICATE: "Certyfikat ISCC EU",
  GMP_PLUS: "Certyfikat GMP+",
  EUDR_STATEMENT: "Oświadczenie EUDR",
  QUALITY_CERTIFICATE: "Świadectwo jakości",
  TRANSPORT_LICENCE: "Licencja transportowa",
  CARRIER_INSURANCE: "Polisa OCP przewoźnika",
  OTHER: "Inny dokument",
};

/**
 * The enum is shared, but each side only offers the kinds that make sense
 * there. The database CHECK guards the owner; this guards the kind, and the
 * Zod schemas enforce it server-side rather than trusting the picker.
 */
export const OFFER_DOCUMENT_KINDS = [
  "LAB_RESULT",
  "QUALITY_CERTIFICATE",
  "ISCC_CERTIFICATE",
  "EUDR_STATEMENT",
  "OTHER",
] as const;

export const CARRIER_DOCUMENT_KINDS = [
  "TRANSPORT_LICENCE",
  "GMP_PLUS",
  "CARRIER_INSURANCE",
  "OTHER",
] as const;

/** Certificates carry more weight than a plain attachment on the board. */
export const CERTIFICATE_KINDS: DocumentKind[] = [
  "ISCC_CERTIFICATE",
  "GMP_PLUS",
  "QUALITY_CERTIFICATE",
  "EUDR_STATEMENT",
];

export const ACCEPTED_MIME_HINT = "PDF, JPG lub PNG, do 10 MB";
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
