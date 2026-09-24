import { StatusBadge } from "@/components/layout/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireCapability } from "@/lib/auth/capabilities";
import {
  formatDate,
  formatPln,
  formatTonnes,
  GRAIN_LABELS,
  JOB_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  PURCHASE_STATUS_LABELS,
  ROLE_LABELS,
} from "@/lib/format";
import { getPlatformStats, listUsers } from "@/modules/admin/queries";
import { listCharges, getRevenueSummary } from "@/modules/billing/queries";
import { TIER_LABELS } from "@/modules/billing/pricing";
import { listAllOffers } from "@/modules/offers/queries";
import { listAllPurchases } from "@/modules/purchases/queries";
import { listAllReviews } from "@/modules/reviews/queries";
import { listAllJobs } from "@/modules/transport/queries";

export default async function AdminPage() {
  await requireCapability("ADMIN");

  const [stats, users, offers, purchases, jobs, reviews, revenue, charges] =
    await Promise.all([
      getPlatformStats(),
      listUsers(),
      listAllOffers(),
      listAllPurchases(),
      listAllJobs(),
      listAllReviews(),
      getRevenueSummary(),
      listCharges(),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Podgląd platformy</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Użytkownicy" value={String(stats.users)} />
        <Stat label="Firmy" value={String(stats.companies)} />
        <Stat label="Oferty" value={`${stats.activeOffers} / ${stats.offers}`} />
        <Stat label="Obrót" value={formatPln(stats.tradedValue)} />
      </div>

      {/* Platform revenue, split by stream. All amounts are mock charges. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Przychód platformy"
          value={formatPln(revenue.totalNet)}
        />
        {revenue.rows.map((row) => (
          <Stat
            key={row.kind}
            label={`${row.label} (${row.count})`}
            value={formatPln(row.totalNet)}
          />
        ))}
      </div>

      <Tabs defaultValue="offers">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="offers">Oferty ({offers.length})</TabsTrigger>
          <TabsTrigger value="purchases">
            Transakcje ({purchases.length})
          </TabsTrigger>
          <TabsTrigger value="jobs">Transport ({jobs.length})</TabsTrigger>
          <TabsTrigger value="users">Użytkownicy ({users.length})</TabsTrigger>
          <TabsTrigger value="reviews">Opinie ({reviews.length})</TabsTrigger>
          <TabsTrigger value="charges">Przychody ({charges.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="offers">
          <Card className="mt-3">
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nr</TableHead>
                      <TableHead>Zboże</TableHead>
                      <TableHead>Sprzedający</TableHead>
                      <TableHead>Lokalizacja</TableHead>
                      <TableHead className="text-right">Tonaż</TableHead>
                      <TableHead className="text-right">Wartość netto</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell className="font-mono text-xs">
                          {offer.reference}
                        </TableCell>
                        <TableCell>{GRAIN_LABELS[offer.grainType]}</TableCell>
                        <TableCell className="text-sm">
                          {offer.farmerName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {offer.postalCode} {offer.city}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTonnes(offer.tonnage)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPln(offer.totalNet)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={offer.status}
                            label={OFFER_STATUS_LABELS[offer.status]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card className="mt-3">
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nr</TableHead>
                      <TableHead>Oferta</TableHead>
                      <TableHead>Kupujący</TableHead>
                      <TableHead>Sprzedający</TableHead>
                      <TableHead className="text-right">Wartość netto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Zlecenie</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-mono text-xs">
                          {purchase.reference}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {purchase.offerReference}
                        </TableCell>
                        <TableCell className="text-sm">
                          {purchase.buyerName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {purchase.farmerName}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPln(purchase.totalNet)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={purchase.status}
                            label={PURCHASE_STATUS_LABELS[purchase.status]}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {purchase.jobReference ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card className="mt-3">
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nr</TableHead>
                      <TableHead>Trasa</TableHead>
                      <TableHead>Przewoźnik</TableHead>
                      <TableHead className="text-right">Tonaż</TableHead>
                      <TableHead className="text-right">Wartość netto</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-xs">
                          {job.reference}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.fromCity} → {job.toCity}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.carrierName ?? (
                            <span className="text-muted-foreground">
                              nieprzypisane
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTonnes(job.tonnage)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {job.totalNet ? formatPln(job.totalNet) : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={job.status}
                            label={JOB_STATUS_LABELS[job.status]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="mt-3">
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Firma</TableHead>
                      <TableHead>Uprawnienia</TableHead>
                      <TableHead>Plan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="text-sm">{user.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.companyName ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={
                                  role === user.activeRole
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {ROLE_LABELS[role]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.subscriptionTier === "PRO"
                                ? "default"
                                : "outline"
                            }
                          >
                            {TIER_LABELS[user.subscriptionTier]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reviews">
          <Card className="mt-3">
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transakcja</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Autor</TableHead>
                      <TableHead>Oceniony</TableHead>
                      <TableHead>Ocena</TableHead>
                      <TableHead>Komentarz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell className="font-mono text-xs">
                          {review.transactionRef}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {review.scope === "TRADE" ? "Handel" : "Transport"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {review.authorName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {review.subjectName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-accent">
                          {"★".repeat(review.rating)}
                          <span className="text-muted-foreground/40">
                            {"★".repeat(5 - review.rating)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs text-sm text-muted-foreground">
                          {review.comment ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="charges">
          <Card className="mt-3">
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Rodzaj</TableHead>
                      <TableHead>Obciążony</TableHead>
                      <TableHead>Powiązanie</TableHead>
                      <TableHead>Opis</TableHead>
                      <TableHead className="text-right">Kwota netto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {charges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(charge.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{charge.kindLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {charge.userName}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {charge.reference}
                        </TableCell>
                        <TableCell className="max-w-xs text-sm text-muted-foreground">
                          {charge.description ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatPln(charge.amountNet)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {charges.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          Brak obciążeń.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
