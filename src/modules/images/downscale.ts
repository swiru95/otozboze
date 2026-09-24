import { IMAGE_BUDGET, base64CharLimit } from "@/modules/images/constants";

export type ProcessedImage = {
  /** Full-size-for-this-demo JPEG data URL. */
  url: string;
  /** Tiny version for lists. */
  thumbnailUrl: string;
  width: number;
  height: number;
};

/** Quality ladder: drop one rung at a time until the budget is met. */
const QUALITY_STEPS = [0.72, 0.6, 0.5, 0.4];

function encode(
  bitmap: ImageBitmap,
  maxEdge: number,
  maxBytes: number,
): string | null {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return null;

  // A white ground, so a transparent PNG does not turn black as JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);

  const limit = base64CharLimit(maxBytes);
  for (const quality of QUALITY_STEPS) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= limit) return url;
  }
  return null;
}

/**
 * Downscales in the browser and returns both sizes. The file itself never
 * leaves the machine; what is stored is this re-encoded, much smaller copy.
 */
export async function processImage(
  file: File,
  budget: { maxEdge: number; maxBytes: number } = IMAGE_BUDGET.photo,
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);

  try {
    const url = encode(bitmap, budget.maxEdge, budget.maxBytes);
    const thumbnailUrl = encode(
      bitmap,
      IMAGE_BUDGET.thumbnail.maxEdge,
      IMAGE_BUDGET.thumbnail.maxBytes,
    );

    if (!url || !thumbnailUrl) {
      throw new Error("Nie udało się zmniejszyć zdjęcia");
    }

    const scale = Math.min(
      1,
      budget.maxEdge / Math.max(bitmap.width, bitmap.height),
    );

    return {
      url,
      thumbnailUrl,
      width: Math.round(bitmap.width * scale),
      height: Math.round(bitmap.height * scale),
    };
  } finally {
    bitmap.close();
  }
}
