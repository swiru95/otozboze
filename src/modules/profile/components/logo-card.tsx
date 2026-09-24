"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrandAvatar } from "@/modules/images/components/brand-avatar";
import { ImageUploader } from "@/modules/images/components/image-uploader";
import { IMAGE_BUDGET } from "@/modules/images/constants";
import {
  removeLogo,
  saveLogo,
} from "@/modules/profile/actions/profile-images";

type Props = {
  logoUrl: string | null;
  image: string | null;
  name: string | null;
  companyName: string | null;
};

export function LogoCard({ logoUrl, image, name, companyName }: Props) {
  const [pending, startTransition] = useTransition();

  const upload = (url: string) =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set("url", url);
      const result = await saveLogo(null, formData);
      if (result.ok) toast.success("Logo zapisane");
      else toast.error(result.error);
    });

  const clear = () =>
    startTransition(async () => {
      const result = await removeLogo();
      if (result.ok) toast.success("Logo usunięte");
      else toast.error(result.error);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Logo firmy</CardTitle>
        <CardDescription>
          Widoczne przy Twoim koncie w całej platformie. Kontrahenci chętniej
          ufają kontu z logo.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <BrandAvatar
            logoUrl={logoUrl}
            image={image}
            name={companyName ?? name}
            size="lg"
          />
          <div className="text-sm">
            <p className="font-medium">{companyName ?? name}</p>
            {logoUrl ? (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3"
                disabled={pending}
                onClick={clear}
              >
                Usuń logo
              </Button>
            ) : (
              <p className="text-muted-foreground">Brak logo</p>
            )}
          </div>
        </div>

        <div className="flex-1">
          <ImageUploader
            idPrefix="logo"
            variant="tile"
            budget={IMAGE_BUDGET.logo}
            disabled={pending}
            hint="albo przeciągnij tutaj. Kwadratowe wychodzi najlepiej."
            onUploaded={(uploaded) => upload(uploaded.url)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
