import type { DocumentKind } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/format";
import {
  CERTIFICATE_KINDS,
  DOCUMENT_KIND_LABELS,
  formatBytes,
} from "@/modules/documents/labels";

export type DocumentDto = {
  id: string;
  kind: DocumentKind;
  fileName: string;
  sizeBytes: number;
  issuer: string | null;
  issuedAt: Date | null;
  validUntil: Date | null;
  isVerified: boolean;
};

export type DocumentVm = {
  id: string;
  kind: DocumentKind;
  kindLabel: string;
  fileName: string;
  sizeLabel: string;
  issuer: string | null;
  issuedLabel: string | null;
  validUntilLabel: string | null;
  /** Past its validity date. An expired certificate proves nothing. */
  isExpired: boolean;
  isVerified: boolean;
  isCertificate: boolean;
};

export function toDocumentRow(doc: DocumentDto, now = new Date()): DocumentVm {
  return {
    id: doc.id,
    kind: doc.kind,
    kindLabel: DOCUMENT_KIND_LABELS[doc.kind],
    fileName: doc.fileName,
    sizeLabel: formatBytes(doc.sizeBytes),
    issuer: doc.issuer,
    issuedLabel: doc.issuedAt ? formatDate(doc.issuedAt) : null,
    validUntilLabel: doc.validUntil ? formatDate(doc.validUntil) : null,
    isExpired: doc.validUntil ? doc.validUntil.getTime() < now.getTime() : false,
    isVerified: doc.isVerified,
    isCertificate: CERTIFICATE_KINDS.includes(doc.kind),
  };
}

/**
 * Drives the board badge. An offer counts as documented when it carries at
 * least one attachment that has not expired, so the badge can never claim
 * more than what is actually on file.
 */
export function hasValidDocuments(docs: DocumentVm[]) {
  return docs.some((doc) => !doc.isExpired);
}
