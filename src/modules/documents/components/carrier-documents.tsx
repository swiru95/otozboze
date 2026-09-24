"use client";

import { ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { plural } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteCarrierDocument,
  uploadCarrierDocument,
} from "@/modules/documents/actions/carrier-documents";
import { DocumentList } from "@/modules/documents/components/document-list";
import {
  MockUploader,
  type UploadedFileMeta,
} from "@/modules/documents/components/mock-uploader";
import { CARRIER_DOCUMENT_KINDS } from "@/modules/documents/labels";
import type { DocumentVm } from "@/modules/documents/view";

/**
 * The haulier's compliance shelf: licence, GMP+, OCP insurance. Buyers and
 * farmers judge a carrier on these, so they live on the transport dashboard
 * rather than behind a settings page.
 */
export function CarrierDocuments({ docs }: { docs: DocumentVm[] }) {
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const upload = (meta: UploadedFileMeta) =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fileName", meta.fileName);
      formData.set("mimeType", meta.mimeType);
      formData.set("sizeBytes", String(meta.sizeBytes));
      formData.set("kind", meta.kind);

      const result = await uploadCarrierDocument(null, formData);
      if (result.ok) toast.success("Dokument dodany do profilu");
      else toast.error(result.error);
    });

  const remove = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", id);
      const result = await deleteCarrierDocument(null, formData);
      if (result.ok) toast.success("Dokument usunięty");
      else toast.error(result.error);
      setDeletingId(null);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="size-5 text-role-transport" />
          Licencje i certyfikaty
        </CardTitle>
        <CardDescription>
          {docs.length === 0
            ? "Dodaj licencję transportową, GMP+ lub polisę OCP. Zleceniodawcy widzą te dokumenty przy Twoim koncie."
            : `${docs.length} ${plural(docs.length, ["dokument", "dokumenty", "dokumentów"])} na Twoim koncie. Zleceniodawcy je widzą.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <MockUploader
          idPrefix="carrier-doc"
          kinds={CARRIER_DOCUMENT_KINDS}
          onUploaded={upload}
          disabled={pending}
        />

        <div className="grid gap-2">
          {docs.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Brak dokumentów. Konto bez licencji nadal może brać zlecenia, ale
              wygląda słabiej przy ofertach.
            </p>
          ) : (
            <DocumentList
              docs={docs}
              onDelete={remove}
              pendingId={deletingId}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
