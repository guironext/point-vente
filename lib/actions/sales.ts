"use server";

import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActiveUser, requireRoles, writeAudit } from "@/lib/auth";
import { invoiceTotals, nextReference, parseLines, ttcFromHt } from "@/lib/utils";
import {
  getRemainingUnits,
  getRemainingUnitsByProduct,
  stockMovementCreates,
  applyStockLedger,
} from "@/lib/stock";
import { ordersSuffix, pathFor } from "@/lib/session";
import { revalidateSession } from "@/lib/revalidate";
import type { ActionState } from "@/lib/actions/auth";

async function nextSaleRef() {
  const count = await prisma.customerOrder.count();
  return nextReference("VTE", count);
}

async function nextFactureRef() {
  const count = await prisma.customerOrder.count({
    where: { reference: { startsWith: "FAC-" } },
  });
  return nextReference("FAC", count);
}

const FACTURE_ROLES = ["ADMIN", "GERANT", "VENDEUR"] as const;
const FACTURE_STOCK_REF = "facture";

type FactureStockLine = {
  productId: string;
  quantityPacks: number;
  product: { name: string; brand?: string };
  packaging: { unitsPerPack: number };
};

type FactureStockOrder = {
  id: string;
  reference: string;
  lines: FactureStockLine[];
};

async function hasStockOut(orderId: string) {
  const existing = await prisma.stockMovement.findFirst({
    where: { referenceId: orderId, type: "OUT" },
    select: { id: true },
  });
  return Boolean(existing);
}

function factureItemLabel(product: { name: string; brand?: string }) {
  return `${product.brand ?? ""} ${product.name}`.trim();
}

async function factureStockError(order: FactureStockOrder): Promise<ActionState> {
  if (!order.lines.length) {
    return { error: "Ajoutez au moins une boisson avant de solder la facture." };
  }
  const productIds = [...new Set(order.lines.map((line) => line.productId))];
  const remainingByProduct = await getRemainingUnitsByProduct(productIds);
  const errors: string[] = [];
  for (const line of order.lines) {
    const label = factureItemLabel(line.product);
    const needed = line.quantityPacks * line.packaging.unitsPerPack;
    const remaining = remainingByProduct.get(line.productId) ?? 0;
    if (remaining <= 0) {
      errors.push(`${label} n'est pas en stock.`);
      continue;
    }
    if (remaining < needed) {
      errors.push(
        `Stock insuffisant pour ${label} (reste ${remaining} unités, besoin ${needed}).`,
      );
      continue;
    }
    remainingByProduct.set(line.productId, remaining - needed);
  }
  if (errors.length) return { error: errors.join(" ") };
}

async function prepareFactureStockOut(userId: string, order: FactureStockOrder) {
  if (await hasStockOut(order.id)) return { skipped: true as const };
  const shortage = await factureStockError(order);
  if (shortage?.error) return { error: shortage.error };
  return stockMovementCreates(
    order.lines.map((line) => ({
      productId: line.productId,
      quantityUnits: -(line.quantityPacks * line.packaging.unitsPerPack),
      type: "OUT" as const,
      referenceType: FACTURE_STOCK_REF,
      referenceId: order.id,
      createdById: userId,
      notes: `Facture payée ${order.reference} · ${factureItemLabel(line.product)}`,
    })),
  );
}

async function restoreFactureStock(orderId: string) {
  const result = await prisma.stockMovement.deleteMany({
    where: {
      referenceId: orderId,
      referenceType: FACTURE_STOCK_REF,
      type: "OUT",
    },
  });
  if (result.count > 0) {
    revalidateSession("/stock");
    revalidateSession("/");
  }
}

export async function createSaleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActiveUser();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerContact = String(formData.get("customerContact") ?? "").trim();
  const customerAddress = String(formData.get("customerAddress") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const lines = parseLines(formData.get("lines"));
  if (!customerName || !customerContact) {
    return { error: "Nom et contact du client requis." };
  }
  if (!lines.length) return { error: "Ajoutez au moins une boisson." };

  type PackagingWithPrice = {
    id: string;
    productId: string;
    product: { unitSalePrice: number };
  };

  const packagings = await prisma.packaging.findMany({
    where: { id: { in: lines.map((l) => l.packagingId) } },
    include: { product: true },
  });
  const packMap = new Map<string, PackagingWithPrice>(
    packagings.map((packaging: PackagingWithPrice) => [packaging.id, packaging]),
  );

  for (const line of lines) {
    const pack = packMap.get(line.packagingId);
    if (!pack || pack.productId !== line.productId) {
      return { error: "Conditionnement invalide." };
    }
  }

  const order = await prisma.customerOrder.create({
    data: {
      reference: await nextSaleRef(),
      customerName,
      customerContact,
      customerAddress,
      notes,
      createdById: user.id,
      status: "CONFIRMED",
      lines: {
        create: lines.map((line) => {
          const pack = packMap.get(line.packagingId);
          if (!pack) {
            throw new Error("Conditionnement introuvable.");
          }
          return {
            productId: line.productId,
            packagingId: line.packagingId,
            quantityPacks: Number(line.packs),
            unitPrice: pack.product.unitSalePrice,
          };
        }),
      },
    },
  });
  await writeAudit(user.id, "create_sale", "CustomerOrder", order.id);
  redirect(pathFor(user.role, `${ordersSuffix(user.role)}/${order.id}`));
}

export async function startDeliveryAction(formData: FormData) {
  const user = await requireActiveUser();
  const id = String(formData.get("id") ?? "");
  const order = await prisma.customerOrder.findUnique({ where: { id } });
  if (!order || order.status !== "CONFIRMED") return;
  await prisma.customerOrder.update({
    where: { id },
    data: { status: "OUT_FOR_DELIVERY" },
  });
  await writeAudit(user.id, "start_delivery", "CustomerOrder", id);
  revalidateSession(`/ventes/${id}`);
}

export async function deliverSaleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActiveUser();
  const id = String(formData.get("id") ?? "");
  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: { lines: { include: { packaging: true, product: true } } },
  });
  if (!order || order.status === "DELIVERED" || order.status === "CANCELLED") {
    return { error: "Cette commande ne peut plus être livrée." };
  }

  for (const line of order.lines) {
    const needed = line.quantityPacks * line.packaging.unitsPerPack;
    const remaining = await getRemainingUnits(line.productId);
    if (remaining < needed) {
      return {
        error: `Stock insuffisant pour ${line.product.name} (reste ${remaining} unités, besoin ${needed}).`,
      };
    }
  }

  const stockOut = await stockMovementCreates(
    order.lines.map(
      (line: {
        productId: string;
        quantityPacks: number;
        packaging: { unitsPerPack: number };
      }) => ({
        productId: line.productId,
        quantityUnits: -(line.quantityPacks * line.packaging.unitsPerPack),
        type: "OUT" as const,
        referenceType: "customer_order",
        referenceId: order.id,
        createdById: user.id,
        notes: `Livraison ${order.reference}`,
      }),
    ),
  );

  await prisma.$transaction([
    prisma.customerOrder.update({
      where: { id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        deliveredById: user.id,
      },
    }),
    prisma.stockMovement.createMany({
      data: stockOut.creates,
    }),
  ]);
  await applyStockLedger(stockOut.ledger);
  await writeAudit(user.id, "deliver_sale", "CustomerOrder", id);
  revalidateSession(`/ventes/${id}`);
  revalidateSession("/stock");
  revalidateSession("/");
  return { success: "Livraison enregistrée, stock décrémenté." };
}

export async function cancelSaleAction(formData: FormData) {
  const user = await requireActiveUser();
  const id = String(formData.get("id") ?? "");
  const order = await prisma.customerOrder.findUnique({ where: { id } });
  if (!order || order.status === "DELIVERED") return;
  await prisma.customerOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await writeAudit(user.id, "cancel_sale", "CustomerOrder", id);
  revalidateSession(`/ventes/${id}`);
}

export async function addCustomerPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActiveUser();
  const orderId = String(formData.get("orderId") ?? "");
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") ?? "") as PaymentMethod;
  if (!orderId || !amount) return { error: "Montant requis." };
  if (!PAYMENT_METHODS.includes(method)) return { error: "Mode de paiement invalide." };

  const order = await prisma.customerOrder.findUnique({
    where: { id: orderId },
    include: {
      lines: { include: { packaging: true, product: true } },
      payments: true,
    },
  });
  if (!order) return { error: "Commande introuvable." };
  const ht = order.lines.reduce(
    (
      sum: number,
      line: {
        quantityPacks: number;
        unitPrice: number;
        packaging: { unitsPerPack: number };
      },
    ) => sum + line.quantityPacks * line.packaging.unitsPerPack * line.unitPrice,
    0,
  );
  const withTva = String(formData.get("taxed") ?? "") === "1";
  const total = withTva ? ttcFromHt(ht) : ht;
  const paid = order.payments.reduce(
    (sum: number, payment: { amount: number }) => sum + payment.amount,
    0,
  );
  if (paid + amount > total) {
    return { error: "Le montant dépasse le reste à encaisser." };
  }

  const completesFacture =
    order.reference.startsWith("FAC-") && paid + amount >= total && total > 0;
  const prepared = completesFacture
    ? await prepareFactureStockOut(user.id, order)
    : { skipped: true as const };
  if ("error" in prepared) return prepared;

  await prisma.$transaction(async (tx) => {
    await tx.customerPayment.create({
      data: {
        orderId,
        amount,
        method,
        createdById: user.id,
        notes: String(formData.get("notes") ?? "").trim(),
      },
    });
    if ("creates" in prepared) {
      await tx.stockMovement.createMany({ data: prepared.creates });
    }
  });
  if ("ledger" in prepared) {
    await applyStockLedger(prepared.ledger);
    revalidateSession("/stock");
    revalidateSession("/");
  }
  await writeAudit(user.id, "customer_payment", "CustomerOrder", orderId);
  revalidateSession(`/ventes/${orderId}`);
  revalidateSession(`/factures/${orderId}`);
  revalidateSession("/factures");
  revalidateSession("/");
  return { success: "Paiement client enregistré." };
}

export async function startFactureAction(_formData?: FormData) {
  const user = await requireRoles([...FACTURE_ROLES]);
  const order = await prisma.customerOrder.create({
    data: {
      reference: await nextFactureRef(),
      customerName: "",
      customerContact: "",
      createdById: user.id,
      status: "DRAFT",
    },
  });
  await writeAudit(user.id, "create_facture", "CustomerOrder", order.id);
  revalidateSession("/factures");
  redirect(pathFor(user.role, `/factures/${order.id}`));
}

export async function saveFactureAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRoles([...FACTURE_ROLES]);
  const id = String(formData.get("id") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerContact = String(formData.get("customerContact") ?? "").trim();
  const customerAddress = String(formData.get("customerAddress") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const lines = parseLines(formData.get("lines"));
  const paymentAmountRaw = Number(formData.get("paymentAmount") ?? 0);
  const paymentAmount = Number.isFinite(paymentAmountRaw) ? paymentAmountRaw : 0;
  const paymentMethod = String(formData.get("paymentMethod") ?? "") as PaymentMethod;

  if (!id) return { error: "Facture introuvable." };
  if (!customerName || !customerContact) {
    return { error: "Nom et contact du client requis." };
  }
  if (!lines.length) return { error: "Ajoutez au moins une boisson." };

  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!order || order.status === "CANCELLED" || order.status === "DELIVERED") {
    return { error: "Cette facture ne peut plus être modifiée." };
  }

  type PackagingWithPrice = {
    id: string;
    productId: string;
    unitsPerPack: number;
    product: { unitSalePrice: number; name: string; brand: string };
  };

  const packagings = await prisma.packaging.findMany({
    where: { id: { in: lines.map((line) => line.packagingId) } },
    include: { product: true },
  });
  const packMap = new Map<string, PackagingWithPrice>(
    packagings.map((packaging: PackagingWithPrice) => [packaging.id, packaging]),
  );

  const pricedLines: {
    productId: string;
    packagingId: string;
    quantityPacks: number;
    unitPrice: number;
    packaging: { unitsPerPack: number };
  }[] = [];
  for (const line of lines) {
    const pack = packMap.get(line.packagingId);
    if (!pack || pack.productId !== line.productId) {
      return { error: "Conditionnement invalide." };
    }
    pricedLines.push({
      productId: line.productId,
      packagingId: line.packagingId,
      quantityPacks: Number(line.packs),
      unitPrice: pack.product.unitSalePrice,
      packaging: { unitsPerPack: pack.unitsPerPack },
    });
  }

  const { ttc } = invoiceTotals(pricedLines);
  const alreadyPaid = order.payments.reduce(
    (sum: number, payment: { amount: number }) => sum + payment.amount,
    0,
  );
  if (paymentAmount < 0) return { error: "Montant de paiement invalide." };
  if (alreadyPaid + paymentAmount > ttc) {
    return { error: "Le paiement dépasse le total TTC." };
  }
  if (paymentAmount > 0 && !PAYMENT_METHODS.includes(paymentMethod)) {
    return { error: "Mode de paiement invalide." };
  }

  const stockOrder: FactureStockOrder = {
    id,
    reference: order.reference,
    lines: pricedLines.map((line) => ({
      productId: line.productId,
      quantityPacks: line.quantityPacks,
      packaging: line.packaging,
      product: {
        name: packMap.get(line.packagingId)?.product.name ?? "boisson",
        brand: packMap.get(line.packagingId)?.product.brand ?? "",
      },
    })),
  };
  const willBePaid = alreadyPaid + paymentAmount >= ttc && ttc > 0;
  const prepared = willBePaid
    ? await prepareFactureStockOut(user.id, stockOrder)
    : { skipped: true as const };
  if ("error" in prepared) return prepared;

  await prisma.$transaction(async (tx) => {
    await tx.customerOrderLine.deleteMany({ where: { orderId: id } });
    await tx.customerOrder.update({
      where: { id },
      data: {
        customerName,
        customerContact,
        customerAddress,
        notes,
        status: "CONFIRMED",
        lines: {
          create: pricedLines.map((line) => ({
            productId: line.productId,
            packagingId: line.packagingId,
            quantityPacks: line.quantityPacks,
            unitPrice: line.unitPrice,
          })),
        },
      },
    });
    if (paymentAmount > 0) {
      await tx.customerPayment.create({
        data: {
          orderId: id,
          amount: paymentAmount,
          method: paymentMethod,
          createdById: user.id,
        },
      });
    }
    if ("creates" in prepared) {
      await tx.stockMovement.createMany({ data: prepared.creates });
    }
  });

  if ("ledger" in prepared) {
    await applyStockLedger(prepared.ledger);
    revalidateSession("/stock");
    revalidateSession("/");
  }

  await writeAudit(user.id, "save_facture", "CustomerOrder", id);
  revalidateSession(`/factures/${id}`);
  revalidateSession("/factures");
  redirect(pathFor(user.role, `/factures/${id}`));
}

async function loadFactureForPayment(id: string) {
  return prisma.customerOrder.findUnique({
    where: { id },
    include: {
      lines: { include: { packaging: true, product: true } },
      payments: true,
    },
  });
}

export async function markFacturePaidAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRoles([...FACTURE_ROLES]);
  const id = String(formData.get("id") ?? "");
  const order = await loadFactureForPayment(id);
  if (!order || order.status === "CANCELLED") {
    return { error: "Cette facture ne peut plus être soldée." };
  }
  const { ttc } = invoiceTotals(order.lines);
  const paid = order.payments.reduce(
    (sum: number, payment: { amount: number }) => sum + payment.amount,
    0,
  );
  const remaining = ttc - paid;
  const prepared = await prepareFactureStockOut(user.id, order);
  if ("error" in prepared) return prepared;
  if (remaining <= 0 && "skipped" in prepared) return;

  await prisma.$transaction(async (tx) => {
    if (remaining > 0) {
      await tx.customerPayment.create({
        data: {
          orderId: id,
          amount: remaining,
          method: "CASH",
          createdById: user.id,
          notes: "Facture marquée payée",
        },
      });
    }
    if ("creates" in prepared) {
      await tx.stockMovement.createMany({ data: prepared.creates });
    }
  });
  if ("ledger" in prepared) {
    await applyStockLedger(prepared.ledger);
    revalidateSession("/stock");
    revalidateSession("/");
  }
  await writeAudit(user.id, "mark_facture_paid", "CustomerOrder", id);
  revalidateSession(`/factures/${id}`);
  revalidateSession("/factures");
  return { success: "Facture soldée, stock mis à jour." };
}

export async function markFactureUnpaidAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRoles([...FACTURE_ROLES]);
  const id = String(formData.get("id") ?? "");
  const order = await prisma.customerOrder.findUnique({ where: { id } });
  if (!order || order.status === "CANCELLED") {
    return { error: "Cette facture ne peut plus être modifiée." };
  }

  await prisma.customerPayment.deleteMany({ where: { orderId: id } });
  await restoreFactureStock(id);
  await writeAudit(user.id, "mark_facture_unpaid", "CustomerOrder", id);
  revalidateSession(`/factures/${id}`);
  revalidateSession("/factures");
  return { success: "Facture marquée impayée, stock rétabli." };
}
