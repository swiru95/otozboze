import { requireCapability } from "@/lib/auth/capabilities";
import { CarrierDocuments } from "@/modules/documents/components/carrier-documents";
import { listCarrierDocuments } from "@/modules/documents/queries";
import { GallerySection } from "@/modules/profile/components/gallery-section";
import { getProfileImages } from "@/modules/profile/queries";
import {
  getRatingSummaries,
  getReviewsWrittenBy,
} from "@/modules/reviews/queries";
import { CarrierJobs } from "@/modules/transport/components/carrier-jobs";
import { FreightBoard } from "@/modules/transport/components/freight-board";
import {
  listAvailableJobs,
  listJobsByCarrier,
} from "@/modules/transport/queries";
import { toJobRow } from "@/modules/transport/view";

export default async function TransportPage() {
  const user = await requireCapability("TRANSPORT");
  const [available, mine, written, docs] = await Promise.all([
    listAvailableJobs(),
    listJobsByCarrier(user.id),
    getReviewsWrittenBy(user.id),
    listCarrierDocuments(user.id),
  ]);

  const profile = await getProfileImages(user.id);

  // Both sides of every run: the carrier judges who commissioned it and who
  // loads the truck, and rates each of them separately.
  const ratings = await getRatingSummaries([
    ...new Set(
      [...available, ...mine].flatMap((job) => [job.buyerId, job.farmerId]),
    ),
  ]);

  return (
    <div className="space-y-6">
      {/* Loads first. A haulier opens this page to find work, not to look at
          their own document locker — the profile sections come after. */}
      <FreightBoard rows={available.map((job) => toJobRow(job, ratings))} />
      <CarrierJobs
        rows={mine.map((job) => toJobRow(job, ratings))}
        reviewedJobs={Object.fromEntries(written.byJob)}
      />

      <CarrierDocuments docs={docs} />

      <GallerySection
        images={profile.galleryUrls}
        title="Flota i baza"
        description="Pokaż ciągniki, naczepy i plac. Zleceniodawcy oglądają te zdjęcia, zanim powierzą Ci ładunek."
        altPrefix="Zdjęcie floty"
      />
    </div>
  );
}
