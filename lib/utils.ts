export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(amount: number) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} F`;
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatDay(date: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    new Date(date),
  );
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
