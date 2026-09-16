import { prisma } from "@/lib/db";

export type StockSnapshot = {
  productId: string;
  incoming: number;
  sold: number;
  remaining: number;
};

export async function getStockByProduct(productIds?: string[]) {
  const movements = await prisma.stockMovement.groupBy({
    by: ["productId", "type"],
    where: productIds ? { productId: { in: productIds } } : undefined,
    _sum: { quantityUnits: true },
  });

  const map = new Map<string, StockSnapshot>();
  for (const row of movements) {
    const current = map.get(row.productId) ?? {
      productId: row.productId,
      incoming: 0,
      sold: 0,
      remaining: 0,
    };
    const qty = row._sum.quantityUnits ?? 0;
    if (row.type === "IN") current.incoming += qty;
    if (row.type === "OUT") current.sold += Math.abs(qty);
    current.remaining += qty;
    map.set(row.productId, current);
  }
  return map;
}

export async function getRemainingUnits(productId: string) {
  const agg = await prisma.stockMovement.aggregate({
    where: { productId },
    _sum: { quantityUnits: true },
  });
  return agg._sum.quantityUnits ?? 0;
}

export async function getRemainingUnitsByProduct(productIds: string[]) {
  const remaining = new Map(productIds.map((id) => [id, 0]));
  if (!productIds.length) return remaining;
  const movements = await prisma.stockMovement.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _sum: { quantityUnits: true },
  });
  for (const row of movements) {
    remaining.set(row.productId, row._sum.quantityUnits ?? 0);
  }
  return remaining;
}

export function ledgerFromDelta(quantityUnits: number, stockRemain: number) {
  return {
    stockIncome: Math.max(quantityUnits, 0),
    stockOut: Math.max(-quantityUnits, 0),
    stockRemain,
  };
}

export async function attachStockLedger<
  T extends { productId: string; quantityUnits: number },
>(entries: T[]) {
  const ids = [...new Set(entries.map((entry) => entry.productId))];
  const remains = new Map<string, number>();
  await Promise.all(
    ids.map(async (id) => {
      remains.set(id, await getRemainingUnits(id));
    }),
  );
  return entries.map((entry) => {
    const next = (remains.get(entry.productId) ?? 0) + entry.quantityUnits;
    remains.set(entry.productId, next);
    return { ...entry, ...ledgerFromDelta(entry.quantityUnits, next) };
  });
}

export type StockMovementWrite = {
  productId: string;
  quantityUnits: number;
  type: "IN" | "OUT" | "ADJUST";
  referenceType: string;
  referenceId: string;
  createdById: string;
  notes?: string;
};

export async function stockMovementCreates(entries: StockMovementWrite[]) {
  const rows = await attachStockLedger(entries);
  return {
    creates: rows.map((row) => ({
      productId: row.productId,
      quantityUnits: row.quantityUnits,
      type: row.type,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      createdById: row.createdById,
      notes: row.notes ?? "",
      stockIncome: row.stockIncome,
      stockOut: row.stockOut,
      stockRemain: row.stockRemain,
    })),
    ledger: rows,
  };
}

export async function applyStockLedger(
  rows: Array<{
    productId: string;
    quantityUnits: number;
    referenceId: string;
    stockIncome: number;
    stockOut: number;
    stockRemain: number;
  }>,
) {
  try {
    for (const row of rows) {
      await prisma.$executeRaw`
        UPDATE "StockMovement" AS m
        SET
          "stockIncome" = ${row.stockIncome},
          "stockOut" = ${row.stockOut},
          "stockRemain" = ${row.stockRemain}
        FROM (
          SELECT id
          FROM "StockMovement"
          WHERE "referenceId" = ${row.referenceId}
            AND "productId" = ${row.productId}
            AND "quantityUnits" = ${row.quantityUnits}
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) AS latest
        WHERE m.id = latest.id
      `;
    }
  } catch (error) {
    console.error("applyStockLedger", error);
  }
}
