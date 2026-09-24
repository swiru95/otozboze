"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { MAX_GALLERY_IMAGES } from "@/modules/images/constants";
import { galleryImageSchema, logoSchema } from "@/modules/images/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Profile images need authentication but no capability: editing your own
 * brand mark is not a trading action. Everything below is scoped to the
 * session user's own row, so there is nothing to authorise against.
 */
export async function saveLogo(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = logoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Niepoprawny obraz",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { logoUrl: parsed.data.url },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeLogo(): Promise<ActionResult> {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { logoUrl: null },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addGalleryImage(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = galleryImageSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Niepoprawny obraz",
    };
  }

  // Read-modify-write, because the database CHECK caps the array length and a
  // blind push would fail with a constraint error instead of a clear message.
  const current = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { galleryUrls: true },
  });

  if (current.galleryUrls.length >= MAX_GALLERY_IMAGES) {
    return { ok: false, error: "Galeria jest pełna — usuń jakieś zdjęcie" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { galleryUrls: [...current.galleryUrls, parsed.data.url] },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

const removeSchema = z.object({ index: z.coerce.number().int().min(0) });

export async function removeGalleryImage(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = removeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "Niepoprawne zdjęcie" };

  const current = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { galleryUrls: true },
  });

  if (parsed.data.index >= current.galleryUrls.length) {
    return { ok: false, error: "Zdjęcie już nie istnieje" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      galleryUrls: current.galleryUrls.filter(
        (_, index) => index !== parsed.data.index,
      ),
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
