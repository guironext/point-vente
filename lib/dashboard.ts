import { prisma } from "@/lib/db";
import { getStockByProduct } from "@/lib/stock";
import type { CustomerOrderStatus } from "@/lib/types";
import { orderAmount, paymentsTotal } from "@/lib/utils";

export type DashboardSale = {
  id: string;
  reference: string;
  customerName: string;
  status: CustomerOrderStatus;
};

export type LowStockItem = {
  id: string;
  brand: string;
  name: string;
  lowStockThreshold: number;
  remaining: number;
};

export async function getStockOverview() {
  const products = (await prisma.product.findMany({
    where: { active: true },
    include: { packagings: true },
  })) as {
    id: string;
    brand: string;
    name: string;
    lowStockThreshold: number;
  }[];
  const stock = await getStockByProduct(products.map((product) => product.id));
  const lowStock: LowStockItem[] = products
    .map((product) => ({
      id: product.id,
      brand: product.brand,
      name: product.name,
      lowStockThreshold: product.lowStockThreshold,
      remaining: stock.get(product.id)?.remaining ?? 0,
    }))
    .filter((product) => product.remaining <= product.lowStockThreshold);
  const incoming = [...stock.values()].reduce((sum, row) => sum + row.incoming, 0);
  const remaining = [...stock.values()].reduce((sum, row) => sum + row.remaining, 0);
  const sold = [...stock.values()].reduce((sum, row) => sum + row.sold, 0);
  return { incoming, remaining, sold, lowStock };
}

export async function getOpenSales(createdById?: string) {
  const orders = (await prisma.customerOrder.findMany({
    where: {
      status: { in: ["CONFIRMED", "OUT_FOR_DELIVERY"] },
      ...(createdById ? { createdById } : {}),
    },
    include: { lines: { include: { packaging: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
  })) as DashboardSale[];
  return orders;
}

export async function getDeliveredRevenue(deliveredById?: string) {
  const delivered = await prisma.customerOrder.findMany({
    where: {
      status: "DELIVERED",
      ...(deliveredById ? { deliveredById } : {}),
    },
    include: { lines: { include: { packaging: true } }, payments: true },
  });
  return delivered.reduce(
    (
      sum: number,
      order: {
        lines: {
          quantityPacks: number;
          unitPrice: number;
          packaging: { unitsPerPack: number };
        }[];
      },
    ) => sum + orderAmount(order.lines),
    0,
  );
}

export async function getSupplierDebt() {
  const invoices = await prisma.supplierInvoice.findMany({
    include: { payments: true },
  });
  return invoices.reduce(
    (
      sum: number,
      invoice: { amount: number; payments: { amount: number }[] },
    ) => sum + Math.max(invoice.amount - paymentsTotal(invoice.payments), 0),
    0,
  );
}

export async function getPendingUserCount() {
  return prisma.user.count({ where: { status: "PENDING_VALIDATION" } });
}

export async function getIncomingPurchasesCount() {
  return prisma.purchaseOrder.count({
    where: { status: { in: ["SENT", "PARTIALLY_RECEIVED"] } },
  });
}
