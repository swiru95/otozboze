import { z } from "zod";

import {
  base64CharLimit,
  IMAGE_BUDGET,
  MAX_GALLERY_IMAGES,
  MAX_OFFER_PHOTOS,
} from "@/modules/images/constants";

/**
 * The trust boundary for anything that ends up in an `<img src>`. Only inline
 * base64 image data is accepted, so a crafted request cannot smuggle in a
 * `javascript:` URL or an external tracking pixel.
 */
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function imageDataUrl(maxBytes: number) {
  return z
    .string()
    .regex(DATA_URL, "Nieobsługiwany format obrazu")
    .max(base64CharLimit(maxBytes), "Obraz jest za duży");
}

export const offerPhotoSchema = z.object({
  url: imageDataUrl(IMAGE_BUDGET.photo.maxBytes),
  thumbnailUrl: imageDataUrl(IMAGE_BUDGET.thumbnail.maxBytes),
});

export const offerPhotosSchema = z.array(offerPhotoSchema).max(MAX_OFFER_PHOTOS);

export const logoSchema = z.object({
  url: imageDataUrl(IMAGE_BUDGET.logo.maxBytes),
});

export const galleryImageSchema = z.object({
  url: imageDataUrl(IMAGE_BUDGET.gallery.maxBytes),
});

export const MAX_GALLERY = MAX_GALLERY_IMAGES;

/** Parses the hidden JSON field the offer form submits. */
export function parseOfferPhotos(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return offerPhotosSchema.safeParse([]);
  }
  try {
    return offerPhotosSchema.safeParse(JSON.parse(raw));
  } catch {
    return offerPhotosSchema.safeParse(null);
  }
}
