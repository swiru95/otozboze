"use client";

import { Truck } from "lucide-react";
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
import { AcceptJobButton } from "@/modules/transport/components/accept-job-button";
import type { JobRowVm } from "@/modules/transport/view";

const SORTS = [
  { value: "distance-asc", label: "Najbliżej" },
  { value: "rate-desc", label: "Najlepiej płatne" },
  { value: "tonnage-desc", label: "Największy ładunek" },
  { value: "newest", label: "Najnowsze" },
];

export function FreightBoard({ rows }: { rows: JobRowVm[] }) {
  const [grain, setGrain] = useState("all");
  const [region, setRegion] = useState("all");
  const [sort, setSort] = useState("distance-asc");

  const grainOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows) seen.set(row.grainType, row.grainLabel);
    return [
      { value: "all", label: "Każdy ładunek" },
      ...[...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "pl")),
    ];
  }, [rows]);

  const regionOptions = useMemo(() => {
    const values = [
      ...new Set(
        rows.map((row) => row.voivodeship).filter((v): v is string => Boolean(v)),
      ),
    ].sort((a, b) => a.localeCompare(b, "pl"));
    return [
      { value: "all", label: "Załadunek: cała Polska" },
      ...values.map((value) => ({ value, label: value })),
    ];
  }, [rows]);

  const visible = useMemo(() => {
    const filtered = rows.filter(
      (row) =>
        (grain === "all" || row.grainType === grain) &&
        (region === "all" || row.voivodeship === region),
    );

    const sorted = [...filtered];
    switch (sort) {
      case "rate-desc":
        sorted.sort((a, b) => b.totalNum - a.totalNum);
        break;
      case "tonnage-desc":
        sorted.sort((a, b) => b.tonnageNum - a.tonnageNum);
        break;
      case "newest":
        sorted.sort((a, b) => b.createdAtMs - a.createdAtMs);
        break;
      default:
        sorted.sort((a, b) => a.distanceNum - b.distanceNum);
    }
    return sorted;
  }, [rows, grain, region, sort]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Giełda frachtowa</CardTitle>
        <CardDescription>
          {visible.length === rows.length
            ? `${rows.length} ${plural(rows.length, ["wolny kurs", "wolne kursy", "wolnych kursów"])}.`
            : `${visible.length} z ${rows.length} kursów.`}{" "}
          Zlecenia powstają automatycznie po zakupie partii.
        </CardDescription>
      </CardHeader>

      {rows.length > 0 && (
        <CardContent>
          <FilterBar activeCount={(grain === "all" ? 0 : 1) + (region === "all" ? 0 : 1)}>
            <FilterSelect
              label="Ładunek"
              value={grain}
              onValueChange={setGrain}
              options={grainOptions}
            />
            <FilterSelect
              label="Województwo załadunku"
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
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={rows.length === 0 ? "Brak wolnych zleceń" : "Nic dla tych filtrów"}
          description={
            rows.length === 0
              ? "Kursy pojawiają się, gdy kupujący kupi partię zboża. Zajrzyj później."
              : "Poszerz województwo albo zmień rodzaj ładunku."
          }
        />
      ) : (
        <>
          <CardContent className="grid gap-3 lg:hidden">
            {visible.map((row) => (
              <article key={row.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg leading-tight font-semibold">
                      {row.fromCity} → {row.toCity}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {row.fromPostalCode} → {row.toPostalCode} · {row.distance}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-semibold tabular-nums">
                      {row.totalNet}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      po prowizji {row.netAfterFee}
                    </p>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Ładunek</dt>
                    <dd className="font-medium">{row.grainLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Tonaż</dt>
                    <dd className="font-semibold tabular-nums">{row.tonnage}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Stawka/t</dt>
                    <dd className="font-semibold tabular-nums">
                      {row.ratePerTonne}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Załadunek: </span>
                    {row.pickupWindow}
                  </p>
                  {row.deliverByLabel && (
                    <p>
                      <span className="text-muted-foreground">Dostawa do: </span>
                      {row.deliverByLabel}
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <AcceptJobButton
                    jobId={row.id}
                    route={row.route}
                    grainLabel={row.grainLabel}
                    tonnage={row.tonnage}
                    distance={row.distance}
                    ratePerTonne={row.ratePerTonne}
                    totalNet={row.totalNet}
                    netAfterFee={row.netAfterFee}
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
                  <TableHead>Trasa</TableHead>
                  <TableHead className="text-right">Dystans</TableHead>
                  <TableHead>Ładunek</TableHead>
                  <TableHead>Załadunek</TableHead>
                  <TableHead>Dostawa do</TableHead>
                  <TableHead className="text-right">Tonaż</TableHead>
                  <TableHead className="text-right">Stawka za tonę</TableHead>
                  <TableHead className="text-right">Zarobek netto</TableHead>
                  <TableHead className="text-right">Po prowizji</TableHead>
                  <TableHead className="text-right">Akcja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">
                        {row.fromCity} → {row.toCity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {row.fromPostalCode} → {row.toPostalCode} ·{" "}
                        {row.reference}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.distance}
                    </TableCell>
                    <TableCell>{row.grainLabel}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.pickupWindow}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.deliverByLabel ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.tonnage}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.ratePerTonne}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.totalNet}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.netAfterFee}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <AcceptJobButton
                          jobId={row.id}
                          route={row.route}
                          grainLabel={row.grainLabel}
                          tonnage={row.tonnage}
                          distance={row.distance}
                          ratePerTonne={row.ratePerTonne}
                          totalNet={row.totalNet}
                          netAfterFee={row.netAfterFee}
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
