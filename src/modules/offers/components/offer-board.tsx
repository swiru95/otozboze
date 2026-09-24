"use client";

import { PackageSearch, Star } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { FilterBar } from "@/components/layout/filter-bar";
import { FilterSelect } from "@/components/layout/filter-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { plural } from "@/lib/format";
import {
  ComplianceBadge,
  OfferDocumentsDialog,
} from "@/modules/documents/components/offer-documents-dialog";
import { OfferThumbnail } from "@/modules/images/components/offer-thumbnail";
import { BuyButton } from "@/modules/offers/components/buy-button";
import type { OfferRowVm } from "@/modules/offers/view";
import { RatingBadge } from "@/modules/reviews/components/rating-badge";

const SORTS = [
  { value: "newest", label: "Najnowsze" },
  { value: "price-asc", label: "Cena za tonę: rosnąco" },
  { value: "price-desc", label: "Cena za tonę: malejąco" },
  { value: "tonnage-desc", label: "Największy tonaż" },
];

type Allowance = {
  isPro: boolean;
  /**
   * Allowance left this month as a number, used only to decide which buttons
   * open the paywall. The authoritative ceiling is a Decimal check in the
   * buy action.
   */
  remainingNum: number;
  /** Same figure, formatted, for the paywall copy. */
  remainingNet: string;
};

function unique(values: Array<string | null>) {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort(
    (a, b) => a.localeCompare(b, "pl"),
  );
}

/** Small marker for a paid highlight, used on both the card and the row. */
function HighlightBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/25 px-2 py-0.5 text-xs font-semibold text-accent-foreground">
      <Star className="size-3 fill-current" />
      Wyróżniona
    </span>
  );
}

export function OfferBoard({
  rows,
  allowance,
}: {
  rows: OfferRowVm[];
  allowance: Allowance;
}) {
  const [grain, setGrain] = useState("all");
  const [region, setRegion] = useState("all");
  const [sort, setSort] = useState("newest");

  const grainOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows) seen.set(row.grainType, row.grainLabel);
    return [
      { value: "all", label: "Wszystkie zboża" },
      ...[...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "pl")),
    ];
  }, [rows]);

  const regionOptions = useMemo(
    () => [
      { value: "all", label: "Cała Polska" },
      ...unique(rows.map((row) => row.voivodeship)).map((value) => ({
        value,
        label: value,
      })),
    ],
    [rows],
  );

  const visible = useMemo(() => {
    const filtered = rows.filter(
      (row) =>
        (grain === "all" || row.grainType === grain) &&
        (region === "all" || row.voivodeship === region),
    );

    const compare = (a: OfferRowVm, b: OfferRowVm) => {
      switch (sort) {
        case "price-asc":
          return a.priceNum - b.priceNum;
        case "price-desc":
          return b.priceNum - a.priceNum;
        case "tonnage-desc":
          return b.tonnageNum - a.tonnageNum;
        default:
          return b.createdAtMs - a.createdAtMs;
      }
    };

    // Paid highlights stay pinned to the top whichever sort is chosen — that
    // is what the farmer paid for.
    return [...filtered].sort(
      (a, b) => Number(b.isHighlighted) - Number(a.isHighlighted) || compare(a, b),
    );
  }, [rows, grain, region, sort]);

  const blocks = (row: OfferRowVm) =>
    !allowance.isPro && row.totalNum > allowance.remainingNum;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Giełda zbóż</CardTitle>
        <CardDescription>
          {visible.length === rows.length
            ? `${rows.length} ${plural(rows.length, ["oferta", "oferty", "ofert"])} do kupienia.`
            : `${visible.length} z ${rows.length} ofert.`}{" "}
          Rezerwacja czeka na potwierdzenie rolnika.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <FilterBar activeCount={(grain === "all" ? 0 : 1) + (region === "all" ? 0 : 1)}>
          <FilterSelect
            label="Rodzaj zboża"
            value={grain}
            onValueChange={setGrain}
            options={grainOptions}
          />
          <FilterSelect
            label="Województwo"
            value={region}
            onValueChange={setRegion}
            options={regionOptions}
          />
          <FilterSelect
            label="Sortuj"
            value={sort}
            onValueChange={setSort}
            options={SORTS}
          />
        </FilterBar>
      </CardContent>

      {visible.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Brak ofert dla tych filtrów"
          description="Zmień rodzaj zboża lub województwo, żeby zobaczyć więcej partii."
        />
      ) : (
        <>
          <CardContent className="grid gap-3 lg:hidden">
            {visible.map((row) => (
              <article
                key={row.id}
                className={`rounded-xl border p-4 ${
                  row.isHighlighted ? "border-accent bg-accent/5" : ""
                }`}
              >
                {(row.isHighlighted || row.hasDocuments) && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {row.isHighlighted && <HighlightBadge />}
                    {row.hasDocuments && (
                      <ComplianceBadge hasCertificate={row.hasCertificate} />
                    )}
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <OfferThumbnail src={row.thumbnailUrl} alt={row.photoAlt} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg leading-tight font-semibold">
                      {row.grainLabel}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      zbiór {row.harvestYear}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-xl font-semibold tabular-nums">
                    {row.tonnage}
                  </p>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">Cena za tonę</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {row.pricePerTonne}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Wartość netto
                    </dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {row.totalNet}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                  <p>
                    {row.location}
                    {row.voivodeship ? `, ${row.voivodeship}` : ""}
                  </p>
                  <p className="flex flex-wrap items-center gap-2">
                    <span>{row.farmerName}</span>
                    <RatingBadge
                      avg={row.farmerRating?.avg}
                      count={row.farmerRating?.count}
                    />
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.reference}
                  </p>
                </div>

                {row.documents.length > 0 && (
                  <div className="mt-3">
                    <OfferDocumentsDialog
                      grainLabel={row.grainLabel}
                      reference={row.reference}
                      docs={row.documents}
                      className="w-full"
                    />
                  </div>
                )}

                <div className="mt-3">
                  <BuyButton
                    offerId={row.id}
                    grainLabel={row.grainLabel}
                    tonnage={row.tonnage}
                    pricePerTonne={row.pricePerTonne}
                    totalNet={row.totalNet}
                    farmerName={row.farmerName}
                    location={row.location}
                    disabled={row.own}
                    disabledReason="To Twoja oferta"
                    blockedByCap={blocks(row)}
                    remainingNet={allowance.remainingNet}
                    size="default"
                    className="w-full"
                  />
                </div>
              </article>
            ))}
          </CardContent>

          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">
                    <span className="sr-only">Zdjęcie</span>
                  </TableHead>
                  <TableHead>Zboże</TableHead>
                  <TableHead>Sprzedający</TableHead>
                  <TableHead>Lokalizacja</TableHead>
                  <TableHead className="text-right">Tonaż</TableHead>
                  <TableHead className="text-right">Cena za tonę</TableHead>
                  <TableHead className="text-right">Wartość netto</TableHead>
                  <TableHead className="text-right">Akcja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow
                    key={row.id}
                    className={row.isHighlighted ? "bg-accent/5" : ""}
                  >
                    <TableCell>
                      <OfferThumbnail
                        src={row.thumbnailUrl}
                        alt={row.photoAlt}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {row.grainLabel}
                        {row.isHighlighted && <HighlightBadge />}
                        {row.hasDocuments && (
                          <ComplianceBadge hasCertificate={row.hasCertificate} />
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        zbiór {row.harvestYear} · {row.reference}
                      </p>
                      {row.documents.length > 0 && (
                        <div className="mt-1">
                          <OfferDocumentsDialog
                            grainLabel={row.grainLabel}
                            reference={row.reference}
                            docs={row.documents}
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p>{row.farmerName}</p>
                      <RatingBadge
                        avg={row.farmerRating?.avg}
                        count={row.farmerRating?.count}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.location}
                      {row.voivodeship ? `, ${row.voivodeship}` : ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.tonnage}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.pricePerTonne}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.totalNet}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <BuyButton
                          offerId={row.id}
                          grainLabel={row.grainLabel}
                          tonnage={row.tonnage}
                          pricePerTonne={row.pricePerTonne}
                          totalNet={row.totalNet}
                          farmerName={row.farmerName}
                          location={row.location}
                          disabled={row.own}
                          disabledReason="To Twoja oferta"
                          blockedByCap={blocks(row)}
                          remainingNet={allowance.remainingNet}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </Card>
  );
}
