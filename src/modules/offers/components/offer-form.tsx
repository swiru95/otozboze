"use client";

import { X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPln, GRAIN_LABELS, harvestYearOptions } from "@/lib/format";
import { PRICING } from "@/modules/billing/pricing";
import { DocumentList } from "@/modules/documents/components/document-list";
import {
  MockUploader,
  type UploadedFileMeta,
} from "@/modules/documents/components/mock-uploader";
import {
  CERTIFICATE_KINDS,
  DOCUMENT_KIND_LABELS,
  formatBytes,
  OFFER_DOCUMENT_KINDS,
} from "@/modules/documents/labels";
import type { DocumentVm } from "@/modules/documents/view";
import { ImageUploader } from "@/modules/images/components/image-uploader";
import { OfferThumbnail } from "@/modules/images/components/offer-thumbnail";
import { MAX_OFFER_PHOTOS } from "@/modules/images/constants";
import type { ProcessedImage } from "@/modules/images/downscale";
import { createOffer } from "@/modules/offers/actions/create-offer";

const YEARS = harvestYearOptions();

/** A titled group of fields — the form reads as three short questions. */
function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid gap-4 border-t pt-5 first:border-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <p className="flex items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {step}
        </span>
        {title}
      </p>
      {children}
    </fieldset>
  );
}

export function OfferForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [tonnage, setTonnage] = useState("");
  const [price, setPrice] = useState("");
  // Attachments are collected client-side and submitted with the form, so the
  // offer and its documents are written in one transaction.
  const [docs, setDocs] = useState<UploadedFileMeta[]>([]);
  const [photos, setPhotos] = useState<ProcessedImage[]>([]);
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) =>
    startTransition(async () => {
      const result = await createOffer(null, formData);
      if (result.ok) {
        toast.success("Oferta opublikowana — jest już na giełdzie");
        formRef.current?.reset();
        setTonnage("");
        setPrice("");
        setDocs([]);
        setPhotos([]);
      } else {
        toast.error(result.error);
      }
    });

  // Not saved yet, so they are shaped for display only.
  const pendingDocs: DocumentVm[] = docs.map((doc, index) => ({
    id: String(index),
    kind: doc.kind,
    kindLabel: DOCUMENT_KIND_LABELS[doc.kind],
    fileName: doc.fileName,
    sizeLabel: formatBytes(doc.sizeBytes),
    issuer: null,
    issuedLabel: null,
    validUntilLabel: null,
    isExpired: false,
    isVerified: false,
    isCertificate: CERTIFICATE_KINDS.includes(doc.kind),
  }));

  const tonnageNum = Number(tonnage.replace(",", "."));
  const priceNum = Number(price.replace(",", "."));
  const total =
    tonnageNum > 0 && priceNum > 0 ? (tonnageNum * priceNum).toFixed(2) : null;

  return (
    <Card id="nowa-oferta">
      <CardHeader>
        <CardTitle className="text-lg">Wystaw zboże</CardTitle>
        <CardDescription>
          Trzy kroki. Oferta trafia na giełdę od razu, ze statusem „Aktywna”.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={submit} className="grid gap-6">
          <Section step={1} title="Co sprzedajesz">
            <div className="grid gap-2">
              <Label htmlFor="grainType">Rodzaj zboża</Label>
              <Select
                name="grainType"
                defaultValue="WHEAT_CONSUMPTION"
                required
              >
                <SelectTrigger id="grainType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {Object.entries(GRAIN_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="harvestYear">Rok zbioru</Label>
              {/* Two realistic seasons instead of a free number field. */}
              <Select
                name="harvestYear"
                defaultValue={String(YEARS[0])}
                required
              >
                <SelectTrigger id="harvestYear" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Parametry (opcjonalnie)</Label>
              <Input
                id="title"
                name="title"
                placeholder="np. białko 12,5%, gęstość 76, sucha"
              />
            </div>
          </Section>

          <Section step={2} title="Ile i za ile">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tonnage">Tonaż (t)</Label>
                <Input
                  id="tonnage"
                  name="tonnage"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="120"
                  value={tonnage}
                  onChange={(event) => setTonnage(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pricePerTonne">Cena za tonę (zł)</Label>
                <Input
                  id="pricePerTonne"
                  name="pricePerTonne"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="985"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
            </div>

            {/* The number the farmer actually cares about, before publishing. */}
            <div
              aria-live="polite"
              className="flex items-baseline justify-between rounded-lg bg-muted px-3 py-3"
            >
              <span className="text-sm text-muted-foreground">
                Wartość oferty netto
              </span>
              <span className="text-xl font-semibold tabular-nums">
                {total ? formatPln(total) : "—"}
              </span>
            </div>
          </Section>

          <Section step={3} title="Gdzie jest towar">
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <div className="grid gap-2">
                <Label htmlFor="postalCode">Kod pocztowy</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  required
                  inputMode="numeric"
                  pattern="\d{2}-\d{3}"
                  placeholder="63-000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">Miejscowość</Label>
                <Input
                  id="city"
                  name="city"
                  required
                  placeholder="Środa Wielkopolska"
                />
              </div>
            </div>
          </Section>

          <Section step={4} title="Zdjęcia partii">
            <p className="-mt-2 text-sm text-muted-foreground">
              Kupujący widzi pierwsze zdjęcie na giełdzie. Pokaż ziarno z
              bliska — oferty ze zdjęciem klika się częściej.
            </p>

            <ImageUploader
              idPrefix="offer-photo"
              disabled={photos.length >= MAX_OFFER_PHOTOS}
              onUploaded={(image) =>
                setPhotos((current) => [...current, image])
              }
            />

            {photos.length > 0 && (
              <ul className="flex flex-wrap gap-3">
                {photos.map((photo, index) => (
                  <li key={photo.thumbnailUrl.slice(-32)} className="relative">
                    <OfferThumbnail
                      src={photo.thumbnailUrl}
                      alt={`Zdjęcie partii ${index + 1} z ${photos.length}`}
                      size="lg"
                    />
                    {index === 0 && (
                      <span className="absolute -top-2 -left-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        główne
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      aria-label={`Usuń zdjęcie ${index + 1}`}
                      onClick={() =>
                        setPhotos((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      className="absolute -top-2 -right-2"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <input
              type="hidden"
              name="photos"
              value={JSON.stringify(
                photos.map((photo) => ({
                  url: photo.url,
                  thumbnailUrl: photo.thumbnailUrl,
                })),
              )}
            />
          </Section>

          <Section step={5} title="Dokumenty i certyfikaty">
            <p className="-mt-2 text-sm text-muted-foreground">
              Opcjonalne, ale oferty z badaniami i certyfikatami sprzedają się
              lepiej. Kupujący zobaczy przy nich zielony znacznik.
            </p>

            <MockUploader
              idPrefix="offer-doc"
              kinds={OFFER_DOCUMENT_KINDS}
              disabled={docs.length >= 5}
              onUploaded={(meta) => setDocs((current) => [...current, meta])}
            />

            {docs.length >= 5 && (
              <p className="text-sm text-muted-foreground">
                Osiągnięto limit pięciu dokumentów na ofertę.
              </p>
            )}

            <DocumentList
              docs={pendingDocs}
              onDelete={(id) =>
                setDocs((current) =>
                  current.filter((_, index) => String(index) !== id),
                )
              }
            />

            <input
              type="hidden"
              name="documents"
              value={JSON.stringify(docs)}
            />
          </Section>

          {/* Listing is free. The only paid element is this opt-in. */}
          <label
            htmlFor="isHighlighted"
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-accent/60 bg-accent/5 p-4"
          >
            <Checkbox id="isHighlighted" name="isHighlighted" className="mt-0.5" />
            <span className="space-y-1">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">Wyróżnij ofertę</span>
                <span className="font-semibold tabular-nums text-primary">
                  +{formatPln(PRICING.offerHighlightNet)}
                </span>
              </span>
              <span className="block text-sm text-muted-foreground">
                Oferta trafia na samą górę giełdy i dostaje wyraźną ramkę.
                Wystawienie samo w sobie jest bezpłatne. Demo: płatność nie
                jest realizowana.
              </span>
            </span>
          </label>

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="w-full sm:w-auto sm:justify-self-start"
          >
            {pending ? "Publikuję…" : "Opublikuj ofertę"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
