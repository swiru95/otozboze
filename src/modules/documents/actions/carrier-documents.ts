"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCapability } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db/prisma";
import {
  carrierDocumentSchema,
  mockStorageUrl,
} from "@/modules/documents/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Mock upload: the browser sends only what it could read off the File object,
 * the file itself never leaves the machine. `url` is a placeholder for the
 * object-storage key a real implementation would return.
 */
export async function uploadCarrierDocument(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCapability("TRANSPORT");

  const parsed = carrierDocumentSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Niepoprawny dokument",
    };
  }

  const input = parsed.data;

  await prisma.document.create({
    data: {
      scope: "CARRIER",
      carrierId: user.id,
      kind: input.kind,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      url: mockStorageUrl(input.fileName),
      issuedAt: new Date(),
    },
  });

  revalidatePath("/transport");
  return { ok: true };
}

const deleteSchema = z.object({ documentId: z.string().min(1) });

export async function deleteCarrierDocument(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCapability("TRANSPORT");

  const parsed = deleteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "Niepoprawny dokument" };

  // Scoped by carrierId, so one haulier can never delete another's licence.
  const deleted = await prisma.document.deleteMany({
    where: {
      id: parsed.data.documentId,
      scope: "CARRIER",
      carrierId: user.id,
    },
  });

  if (deleted.count === 0) {
    return { ok: false, error: "Nie znaleziono dokumentu" };
  }

  revalidatePath("/transport");
  return { ok: true };
}
