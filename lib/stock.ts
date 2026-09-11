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
