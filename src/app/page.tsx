import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { ROLE_ICON, ROLE_SOFT } from "@/components/layout/role-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { UserRole } from "@/generated/prisma/enums";
import { getSession } from "@/lib/auth/session";
import { formatDate, formatPln, plural, ROLE_HOME, ROLE_LABELS } from "@/lib/format";
import { PlanBanner } from "@/modules/billing/components/plan-banner";
import { getBuyerAllowance } from "@/modules/billing/queries";
import { getPlatformStats } from "@/modules/admin/queries";
import {
  getBuyerSummary,
  getCarrierSummary,
  getFarmerSummary,
} from "@/modules/dashboard/queries";
import { BrandAvatar } from "@/modules/images/components/brand-avatar";
import { MarketPanel } from "@/modules/market/components/market-panel";
import { LogoCard } from "@/modules/profile/components/logo-card";
import { getProfileImages } from "@/modules/profile/queries";

/** Every card leads somewhere, and the label is the verb, not "Przejdź". */
const ROLE_CTA: Record<UserRole, { pitch: string; action: string }> = {
  FARMER: {
    pitch: "Wystaw partię zboża i sprzedaj bez pośredników.",
    action: "Wystaw zboże",
  },
  BUYER: {
    pitch: "Przeglądaj giełdę i kupuj partie od rolników.",
    action: "Zobacz oferty",
  },
  TRANSPORT: {
    pitch: "Bierz kursy z giełdy frachtowej i planuj trasy.",
    action: "Znajdź zlecenie",
  },
  ADMIN: {
    pitch: "Podgląd wszystkich transakcji na platformie.",
    action: "Otwórz podgląd",
  },
};

/** Every tile is a link: a number the reader cannot act on is decoration. */
type Tile = { label: string; value: string; href: string };

async function tilesFor(
  role: UserRole | null,
  userId: string,
): Promise<Tile[]> {
  if (role === "FARMER") {
    const s = await getFarmerSummary(userId);
    return [
      { label: "Moje aktywne oferty", value: String(s.active), href: "/farmer" },
      {
        label: "Rezerwacje do potwierdzenia",
        value: String(s.toConfirm),
        href: "/farmer",
      },
      {
        label: "Czeka na przewoźnika",
        value: String(s.awaitingCarrier),
        href: "/farmer",
      },
      {
        label: "Utarg w tym miesiącu",
        value: formatPln(s.revenueThisMonth),
        href: "/farmer",
      },
    ];
  }

  if (role === "BUYER") {
    const s = await getBuyerSummary(userId);
    return [
      { label: "Ofert na giełdzie", value: String(s.onBoard), href: "/buyer" },
      { label: "Moje zakupy", value: String(s.bought), href: "/buyer" },
      { label: "W toku", value: String(s.waiting), href: "/buyer" },
      {
        label: "Wydane w tym miesiącu",
        value: formatPln(s.spentThisMonth),
        href: "/buyer",
      },
    ];
  }

  if (role === "TRANSPORT") {
    const s = await getCarrierSummary(userId);
    return [
      { label: "Wolne kursy", value: String(s.openJobs), href: "/transport" },
      { label: "Moje kursy w toku", value: String(s.myRuns), href: "/transport" },
      { label: "Kursy łącznie", value: String(s.done), href: "/transport" },
      {
        label: "Zarobek w tym miesiącu",
        value: formatPln(s.earnedThisMonth),
        href: "/transport",
      },
    ];
  }

  if (role === "ADMIN") {
    const s = await getPlatformStats();
    return [
      { label: "Użytkownicy", value: String(s.users), href: "/admin" },
      { label: "Aktywne oferty", value: String(s.activeOffers), href: "/admin" },
      { label: "Transakcje", value: String(s.purchases), href: "/admin" },
      {
        label: "Obrót platformy",
        value: formatPln(s.tradedValue),
        href: "/admin",
      },
    ];
  }

  return [];
}

export default async function DashboardPage() {
  const { user, activeRole } = await getSession();
  const tiles = await tilesFor(activeRole, user.id);
  // The plan only concerns the buying side, so it appears when that hat is on.
  const allowance =
    activeRole === "BUYER" ? await getBuyerAllowance(user.id) : null;
  const profile = await getProfileImages(user.id);
  const ActiveIcon: LucideIcon | null = activeRole
    ? ROLE_ICON[activeRole]
    : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <BrandAvatar
              logoUrl={profile.logoUrl}
              image={profile.image}
              name={profile.companyName ?? profile.name}
              size="lg"
            />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Dzień dobry, {user.name?.split(" ")[0]}
              </h1>
              {profile.companyName && (
                <p className="text-sm text-muted-foreground">
                  {profile.companyName}
                </p>
              )}
            </div>
          </div>
          {activeRole && ActiveIcon ? (
            <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${ROLE_SOFT[activeRole]}`}
              >
                <ActiveIcon className="size-4" />
                {ROLE_LABELS[activeRole]}
              </span>
              {user.roles.length > 1 && (
                <span className="text-sm">
                  Masz {user.roles.length}{" "}
                  {plural(user.roles.length, ["rolę", "role", "ról"])} — przełączasz je na dole ekranu
                  albo w pasku u góry.
                </span>
              )}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Twoje konto nie ma jeszcze żadnej roli. Możesz przeglądać
              platformę, ale nie wystawisz ani nie kupisz partii.
            </p>
          )}
        </div>

        {allowance && (
          <PlanBanner
            isPro={allowance.isPro}
            capNet={formatPln(allowance.capNet)}
            spentNet={formatPln(allowance.spentNet)}
            remainingNet={formatPln(allowance.remainingNet)}
            usedPct={allowance.usedPct}
            validUntil={
              allowance.validUntil ? formatDate(allowance.validUntil) : null
            }
          />
        )}

        {tiles.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile) => (
              <Link
                key={tile.label}
                href={tile.href}
                className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Card size="sm" className="h-full transition-colors hover:border-primary">
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {tile.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {tile.value}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {user.roles.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Co chcesz zrobić?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {user.roles.map((role) => {
                const Icon = ROLE_ICON[role];
                return (
                  <Card key={role}>
                    <CardContent className="flex h-full flex-col gap-3">
                      <span
                        className={`inline-flex size-10 items-center justify-center rounded-lg ${ROLE_SOFT[role]}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">{ROLE_LABELS[role]}</p>
                        <p className="text-sm text-muted-foreground">
                          {ROLE_CTA[role].pitch}
                        </p>
                      </div>
                      <Button asChild className="w-full sm:w-auto sm:self-start">
                        <Link href={ROLE_HOME[role]}>
                          {ROLE_CTA[role].action}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <LogoCard
          logoUrl={profile.logoUrl}
          image={profile.image}
          name={profile.name}
          companyName={profile.companyName}
        />
      </div>

      <MarketPanel />
    </div>
  );
}
