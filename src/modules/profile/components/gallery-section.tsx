"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUploader } from "@/modules/images/components/image-uploader";
import { IMAGE_BUDGET, MAX_GALLERY_IMAGES } from "@/modules/images/constants";
import {
  addGalleryImage,
  removeGalleryImage,
} from "@/modules/profile/actions/profile-images";

type Props = {
  images: string[];
  title: string;
  description: string;
  /** Describes a single picture, e.g. "Zdjęcie floty". */
  altPrefix: string;
};

/** Shared by the carrier fleet and the buyer's storage pictures. */
export function GallerySection({
  images,
  title,
  description,
  altPrefix,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<number | null>(null);

  const add = (url: string) =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set("url", url);
      const result = await addGalleryImage(null, formData);
      if (result.ok) toast.success("Zdjęcie dodane do galerii");
      else toast.error(result.error);
    });

  const remove = (index: number) => {
    setRemoving(index);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("index", String(index));
      const result = await removeGalleryImage(null, formData);
      if (result.ok) toast.success("Zdjęcie usunięte");
      else toast.error(result.error);
      setRemoving(null);
    });
  };

  const full = images.length >= MAX_GALLERY_IMAGES;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-start">
        <div className="space-y-2">
          <ImageUploader
            idPrefix="gallery"
            budget={IMAGE_BUDGET.gallery}
            disabled={pending || full}
            onUploaded={(uploaded) => add(uploaded.url)}
          />
          <p className="text-sm text-muted-foreground">
            {full
              ? "Galeria jest pełna. Usuń zdjęcie, żeby dodać nowe."
              : `Możesz dodać jeszcze ${MAX_GALLERY_IMAGES - images.length} zdjęć.`}
          </p>
        </div>

        {images.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Brak zdjęć. Konta ze zdjęciami wyglądają wiarygodniej dla
            kontrahentów.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((url, index) => (
              <li key={url.slice(-32) + index} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- inline
                    data URL: next/image cannot optimise it. */}
                <img
                  src={url}
                  alt={`${altPrefix} ${index + 1} z ${images.length}`}
                  loading="lazy"
                  className="aspect-4/3 w-full rounded-lg object-cover ring-1 ring-foreground/10"
                />
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Usuń ${altPrefix.toLowerCase()} ${index + 1}`}
                  disabled={removing === index}
                  onClick={() => remove(index)}
                  className="absolute top-2 right-2"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
