/**
 * MOCK STORAGE. Images are downscaled in the browser and stored as JPEG data
 * URLs, so they survive a reload and a server render without a bucket. A real
 * implementation replaces the value in the column with an object key and
 * touches nothing else.
 *
 * The budgets matter: the marketplace board is opened on a phone on rural
 * mobile data, so the list carries only the tiny thumbnail.
 */
export const IMAGE_BUDGET = {
  photo: { maxEdge: 1024, maxBytes: 150 * 1024 },
  thumbnail: { maxEdge: 200, maxBytes: 15 * 1024 },
  logo: { maxEdge: 256, maxBytes: 25 * 1024 },
  // Smaller than an offer photo: a profile shows up to eight at once.
  gallery: { maxEdge: 800, maxBytes: 100 * 1024 },
} as const;

export const MAX_OFFER_PHOTOS = 6;
export const MAX_GALLERY_IMAGES = 8;

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";
export const ACCEPTED_IMAGE_HINT = "JPG, PNG lub WebP";

/** Base64 inflates by 4/3, plus room for the `data:image/jpeg;base64,` prefix. */
export function base64CharLimit(maxBytes: number) {
  return Math.ceil(maxBytes / 3) * 4 + 64;
}
