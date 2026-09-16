import { prisma } from "@/lib/db";
import type {
  CashOutflowReason,
  CustomerOrderStatus,
  PaymentMethod,
} from "@/lib/types";
import { PAYMENT_METHODS } from "@/lib/types";
import { invoiceStatus } from "@/lib/labels";
import {
  fullName,
  orderAmount,
  paymentsTotal,
  startOfDay,
  startOfWeek,
} from "@/lib/utils";

export type AccountingPeriod = "jour" | "semaine" | "tout";

export type AccountingSale = {
  id: string;
  reference: string;
  customerName: string;
  status: CustomerOrderStatus;
  createdAt: Date;
  deliveredAt: Date | null;
  total: number;
  paid: number;
  createdByName: string;
};

export type AccountingPayment = {
  id: string;
  amount: number;
  method: PaymentMethod;
  paidAt: Date;
  orderId: string;
  reference: string;
  customerName: string;
  createdById: string;
  createdByName: string;
};

export type AccountingOutflow = {
  id: string;
  amount: number;
  method: PaymentMethod;
  reason: CashOutflowReason;
  notes: string;
  paidAt: Date;
  createdById: string;
  createdByName: string;
};

export type AccountingSeller = {
  id: string;
  name: string;
  collected: number;
  spent: number;
  cashIn: number;
  cashOut: number;
};

export type JournalEntry = {
  id: string;
  at: Date;
  kind: "in" | "out";
  label: string;
  detail: string;
  amount: number;
  method: PaymentMethod;
  href?: string;
  createdByName: string;
};

function emptyByMethod(): Record<PaymentMethod, number> {
  return { CASH: 0, TRANSFER: 0, MOBILE_MONEY: 0, CHECK: 0, OTHER: 0 };
}

function addByMethod(
  target: Record<PaymentMethod, number>,
  items: { amount: number; method: PaymentMethod }[],
) {
  for (const item of items) target[item.method] += item.amount;
  return target;
}

export function parseAccountingPeriod(value?: string): AccountingPeriod {
  if (value === "jour" || value === "semaine" || value === "tout") return value;
  return "tout";
}

export function periodStart(period: AccountingPeriod) {
  if (period === "jour") return startOfDay();
  if (period === "semaine") return startOfWeek();
  return undefined;
}

type UserName = { id: string; firstName: string; lastName: string };

type OrderRow = {
  id: string;
  reference: string;
  customerName: string;
  status: CustomerOrderStatus;
  createdAt: Date;
  deliveredAt: Date | null;
  createdBy: UserName;
  lines: {
    quantityPacks: number;
    unitPrice: number;
    packaging: { unitsPerPack: number };
  }[];
  payments: {
    id: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
  }[];
};

export async function getAccountingSnapshot(options: {
  createdById?: string;
  salesHref: (id: string) => string;
  period: AccountingPeriod;
}) {
  const from = periodStart(options.period);
  const paidAtFilter = from ? { gte: from } : undefined;

  const [orders, outflows] = await Promise.all([
    prisma.customerOrder.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...(options.createdById ? { createdById: options.createdById } : {}),
      },
      include: {
        lines: { include: { packaging: true } },
        payments: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cashOutflow.findMany({
      where: {
        ...(options.createdById ? { createdById: options.createdById } : {}),
        ...(paidAtFilter ? { paidAt: paidAtFilter } : {}),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  const inPeriod = (date: Date) => !from || date >= from;

  const sales: AccountingSale[] = (orders as OrderRow[])
    .filter((order) => order.status !== "DRAFT")
    .filter((order) => inPeriod(order.deliveredAt ?? order.createdAt))
    .map((order) => ({
      id: order.id,
      reference: order.reference,
      customerName: order.customerName,
      status: order.status,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      total: orderAmount(order.lines),
      paid: paymentsTotal(order.payments),
      createdByName: fullName(order.createdBy),
    }));

  const payments: AccountingPayment[] = (orders as OrderRow[]).flatMap((order) =>
    order.payments
      .filter((payment) => inPeriod(payment.paidAt))
      .map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        paidAt: payment.paidAt,
        orderId: order.id,
        reference: order.reference,
        customerName: order.customerName,
        createdById: order.createdBy.id,
        createdByName: fullName(order.createdBy),
      })),
  );

  const outflowRows: AccountingOutflow[] = outflows.map((row) => ({
    id: row.id,
    amount: row.amount,
    method: row.method,
    reason: row.reason,
    notes: row.notes,
    paidAt: row.paidAt,
    createdById: row.createdBy.id,
    createdByName: fullName(row.createdBy),
  }));

  const inByMethod = addByMethod(emptyByMethod(), payments);
  const outByMethod = addByMethod(emptyByMethod(), outflowRows);
  const collected = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const spent = outflowRows.reduce((sum, outflow) => sum + outflow.amount, 0);
  const cashIn = inByMethod.CASH;
  const cashOut = outByMethod.CASH;
  const cashRemain = cashIn - cashOut;
  const salesTotal = sales.reduce((sum, sale) => sum + sale.total, 0);
  const salesPaid = sales.reduce((sum, sale) => sum + sale.paid, 0);

  const sellersMap = new Map<string, AccountingSeller>();
  function sellerRow(id: string, name: string) {
    const existing = sellersMap.get(id);
    if (existing) return existing;
    const created: AccountingSeller = {
      id,
      name,
      collected: 0,
      spent: 0,
      cashIn: 0,
      cashOut: 0,
    };
    sellersMap.set(id, created);
    return created;
  }
  for (const payment of payments) {
    const seller = sellerRow(payment.createdById, payment.createdByName);
    seller.collected += payment.amount;
    if (payment.method === "CASH") seller.cashIn += payment.amount;
  }
  for (const outflow of outflowRows) {
    const seller = sellerRow(outflow.createdById, outflow.createdByName);
    seller.spent += outflow.amount;
    if (outflow.method === "CASH") seller.cashOut += outflow.amount;
  }
  const sellers = [...sellersMap.values()].sort(
    (a, b) => b.collected + b.spent - (a.collected + a.spent),
  );

  const journal: JournalEntry[] = [
    ...payments.map((payment) => ({
      id: `in-${payment.id}`,
      at: payment.paidAt,
      kind: "in" as const,
      label: payment.reference,
      detail: payment.customerName,
      amount: payment.amount,
      method: payment.method,
      href: options.salesHref(payment.orderId),
      createdByName: payment.createdByName,
    })),
    ...outflowRows.map((outflow) => ({
      id: `out-${outflow.id}`,
      at: outflow.paidAt,
      kind: "out" as const,
      label: outflow.reason,
      detail: outflow.notes,
      amount: outflow.amount,
      method: outflow.method,
      createdByName: outflow.createdByName,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    sales,
    payments,
    outflows: outflowRows,
    sellers,
    journal,
    inByMethod,
    outByMethod,
    collected,
    spent,
    cashIn,
    cashOut,
    cashRemain,
    salesTotal,
    salesPaid,
    salesUnpaid: Math.max(salesTotal - salesPaid, 0),
    unpaidCount: sales.filter(
      (sale) => invoiceStatus(sale.paid, sale.total) !== "PAID",
    ).length,
    methods: PAYMENT_METHODS,
  };
}
