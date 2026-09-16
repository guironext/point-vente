export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(amount: number) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} F`;
}

export function formatFcfa(amount: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount)}\u00a0FCFA`;
}

const ABIDJAN = "Africa/Abidjan";

const FR_MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function abidjanParts(date: Date | string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ABIDJAN,
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(date));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const monthIndex = Number(get("month")) - 1;
  return {
    day: get("day"),
    month: FR_MONTHS[monthIndex] ?? get("month"),
    year: get("year"),
    hour: get("hour").padStart(2, "0"),
    minute: get("minute").padStart(2, "0"),
  };
}

export function formatDay(date: Date | string) {
  const { day, month, year } = abidjanParts(date);
  return `${day} ${month} ${year}`;
}

export function formatDate(date: Date | string) {
  const { day, month, year, hour, minute } = abidjanParts(date);
  return `${day} ${month} ${year} à ${hour}:${minute}`;
}

export function calendarDay(date: Date | string = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ABIDJAN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function startOfDay(date: Date | string = new Date()) {
  return new Date(`${calendarDay(date)}T00:00:00+00:00`);
}

export function startOfWeek(date: Date | string = new Date()) {
  const start = startOfDay(date);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: ABIDJAN,
    weekday: "short",
  }).format(start);
  const offset: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  start.setUTCDate(start.getUTCDate() - (offset[weekday] ?? 0));
  return start;
}

export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.lastName} ${user.firstName}`.trim();
}

export function packsToUnits(packs: number, unitsPerPack: number) {
  return packs * unitsPerPack;
}

export function describeUnits(
  units: number,
  packagings: { type: "CASIER" | "CARTON"; unitsPerPack: number }[],
) {
  if (units === 0) return "0 unité";
  if (!packagings.length) return `${units} unité${units > 1 ? "s" : ""}`;
  return packagings
    .map((pack) => {
      const packs = Math.floor(units / pack.unitsPerPack);
      const rest = units % pack.unitsPerPack;
      const label = pack.type === "CASIER" ? "casier" : "carton";
      const main = `${packs} ${label}${packs > 1 ? "s" : ""}`;
      return rest ? `${main} + ${rest} u.` : main;
    })
    .join(" · ");
}

export function parseLines(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{
      productId: string;
      packagingId: string;
      packs: number;
    }>;
    return parsed.filter(
      (line) => line.productId && line.packagingId && Number(line.packs) > 0,
    );
  } catch {
    return [];
  }
}

export function nextReference(prefix: string, count: number) {
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export function lineUnits(packs: number, unitsPerPack: number) {
  return packs * unitsPerPack;
}

export function lineAmount(packs: number, unitsPerPack: number, unitPrice: number) {
  return packs * unitsPerPack * unitPrice;
}

export type PricedOrderLine = {
  quantityPacks: number;
  unitPrice: number;
  packaging: { unitsPerPack: number };
};

export function orderAmount(lines: PricedOrderLine[]) {
  return lines.reduce(
    (sum: number, line: PricedOrderLine) =>
      sum +
      lineAmount(line.quantityPacks, line.packaging.unitsPerPack, line.unitPrice),
    0,
  );
}

export function paymentsTotal(payments: { amount: number }[]) {
  return payments.reduce(
    (sum: number, payment: { amount: number }) => sum + payment.amount,
    0,
  );
}

export const TVA_RATE = 0.18;

export function tvaFromHt(ht: number) {
  return Math.round(ht * TVA_RATE);
}

export function ttcFromHt(ht: number) {
  return ht + tvaFromHt(ht);
}

export function invoiceTotals(lines: PricedOrderLine[]) {
  const ht = orderAmount(lines);
  const tva = tvaFromHt(ht);
  return { ht, tva, ttc: ht + tva };
}
