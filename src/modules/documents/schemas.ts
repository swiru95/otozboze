import { z } from "zod";

import {
  CARRIER_DOCUMENT_KINDS,
  MAX_DOCUMENT_BYTES,
  OFFER_DOCUMENT_KINDS,
} from "@/modules/documents/labels";

/**
 * What the mock uploader submits. No file content ever reaches the server —
 * only what the browser could read from the File object.
 */
const fileMetaSchema = z.object({
  fileName: z.string().min(1, "Brak nazwy pliku").max(200),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.coerce
    .number()
    .int()
    .positive("Pusty plik")
    .max(MAX_DOCUMENT_BYTES, "Plik jest większy niż 10 MB"),
});

export const offerDocumentSchema = fileMetaSchema.extend({
  kind: z.enum(OFFER_DOCUMENT_KINDS),
});

export const carrierDocumentSchema = fileMetaSchema.extend({
  kind: z.enum(CARRIER_DOCUMENT_KINDS),
});

/** At most five attachments per offer keeps the demo board readable. */
export const offerDocumentsSchema = z.array(offerDocumentSchema).max(5);

export type OfferDocumentInput = z.infer<typeof offerDocumentSchema>;
export type CarrierDocumentInput = z.infer<typeof carrierDocumentSchema>;

/** Parses the hidden JSON field the offer form submits. */
export function parseOfferDocuments(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return offerDocumentsSchema.safeParse([]);
  }
  try {
    return offerDocumentsSchema.safeParse(JSON.parse(raw));
  } catch {
    return offerDocumentsSchema.safeParse(null);
  }
}

/**
 * Stand-in for an object-storage key. Nothing is served from this path — it
 * exists so the shape is right when real storage arrives.
 */
export function mockStorageUrl(fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  return `/mock-documents/${crypto.randomUUID()}-${safe}`;
}
