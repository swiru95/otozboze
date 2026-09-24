import { prisma } from "@/lib/db/prisma";
import { toDocumentRow, type DocumentVm } from "@/modules/documents/view";

export const documentSelect = {
  id: true,
  kind: true,
  fileName: true,
  sizeBytes: true,
  issuer: true,
  issuedAt: true,
  validUntil: true,
  isVerified: true,
} as const;

/** Licences and certificates a haulier has on file. */
export async function listCarrierDocuments(
  carrierId: string,
): Promise<DocumentVm[]> {
  const rows = await prisma.document.findMany({
    where: { scope: "CARRIER", carrierId },
    select: documentSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => toDocumentRow(row));
}

/** How many carriers have at least one valid licence on file. Admin only. */
export async function countCarrierDocuments() {
  return prisma.document.count({ where: { scope: "CARRIER" } });
}
