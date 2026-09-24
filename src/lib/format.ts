import type {
  GrainType,
  OfferStatus,
  PurchaseStatus,
  TransportJobStatus,
  UserRole,
} from "@/generated/prisma/enums";

const pln = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 0,
});

const tonnes = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });

export const formatPln = (value: string | number) => pln.format(Number(value));
export const formatTonnes = (value: string | number) =>
  `${tonnes.format(Number(value))} t`;

export const formatDate = (value: Date | null) =>
  value ? new Intl.DateTimeFormat("pl-PL").format(value) : "—";

const dateTime = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "short",
  timeStyle: "short",
});

/** For deadlines measured in hours, where a bare date would be ambiguous. */
export const formatDateTime = (value: Date | null) =>
  value ? dateTime.format(value) : "—";

export const GRAIN_LABELS: Record<GrainType, string> = {
  WHEAT_CONSUMPTION: "Pszenica konsumpcyjna",
  WHEAT_FEED: "Pszenica paszowa",
  RYE: "Żyto",
  BARLEY_MALTING: "Jęczmień browarny",
  BARLEY_FEED: "Jęczmień paszowy",
  OATS: "Owies",
  TRITICALE: "Pszenżyto",
  MAIZE: "Kukurydza",
  RAPESEED: "Rzepak",
  SOYBEAN: "Soja",
  SUNFLOWER: "Słonecznik",
  OTHER: "Inne",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  FARMER: "Rolnik",
  BUYER: "Kupujący",
  TRANSPORT: "Przewoźnik",
  ADMIN: "Administrator",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  DRAFT: "Szkic",
  ACTIVE: "Aktywna",
  RESERVED: "Zarezerwowana — czeka na Ciebie",
  SOLD: "Sprzedana",
  CANCELLED: "Wycofana",
  EXPIRED: "Wygasła",
};

/** Labels say what is being waited for, not just that something is waiting. */
export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  PENDING: "Czeka na potwierdzenie rolnika",
  CONFIRMED: "Potwierdzony — czeka na przewoźnika",
  IN_TRANSPORT: "W drodze do kupującego",
  DELIVERED: "Dostarczony",
  SETTLED: "Rozliczony",
  CANCELLED: "Anulowany",
};

export const JOB_STATUS_LABELS: Record<TransportJobStatus, string> = {
  AVAILABLE: "Wolne — do wzięcia",
  ASSIGNED: "Czeka na akceptację kupującego",
  IN_TRANSIT: "W trasie",
  DELIVERED: "Dostarczone",
  CANCELLED: "Anulowane",
};

export const ROLE_HOME: Record<UserRole, string> = {
  FARMER: "/farmer",
  BUYER: "/buyer",
  TRANSPORT: "/transport",
  ADMIN: "/admin",
};

/** Short, unambiguous month-day for list rows. */
export const formatDayMonth = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(
        value,
      )
    : "—";

/** Harvest years an offer may realistically carry: this season and the last. */
export function harvestYearOptions(now = new Date()) {
  const year = now.getFullYear();
  return [year, year - 1];
}

/**
 * Polish plural forms: 1 -> one, 2-4 -> few, otherwise many (with the 12-14
 * exception). "1 wolnych kursów" is the kind of copy a farmer notices.
 */
export function plural(
  count: number,
  forms: [one: string, few: string, many: string],
) {
  const abs = Math.abs(count);
  if (abs === 1) return forms[0];
  const lastTwo = abs % 100;
  const last = abs % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    return forms[1];
  }
  return forms[2];
}
