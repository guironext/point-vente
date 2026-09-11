"use server";

import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActiveUser, writeAudit } from "@/lib/auth";
import { nextReference, parseLines } from "@/lib/utils";
import { getRemainingUnits } from "@/lib/stock";
import { ordersSuffix, pathFor } from "@/lib/session";
import { revalidateSession } from "@/lib/revalidate";
import type { ActionState } from "@/lib/actions/auth";

async function nextSaleRef() {
  const count = await prisma.customerOrder.count();
  return nextReference("VTE", count);
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

  const stockOut = order.lines.map(
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
      data: stockOut,
    }),
  ]);
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
      lines: { include: { packaging: true } },
      payments: true,
    },
  });
  if (!order) return { error: "Commande introuvable." };
  const total = order.lines.reduce(
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
  const paid = order.payments.reduce(
    (sum: number, payment: { amount: number }) => sum + payment.amount,
    0,
  );
  if (paid + amount > total) {
    return { error: "Le montant dépasse le reste à encaisser." };
  }

  await prisma.customerPayment.create({
    data: {
      orderId,
      amount,
      method,
      createdById: user.id,
      notes: String(formData.get("notes") ?? "").trim(),
    },
  });
  await writeAudit(user.id, "customer_payment", "CustomerOrder", orderId);
  revalidateSession(`/ventes/${orderId}`);
  revalidateSession("/");
  return { success: "Paiement client enregistré." };
}
