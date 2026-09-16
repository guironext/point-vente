"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActiveUser, requireRoles, writeAudit } from "@/lib/auth";
import { nextReference, parseLines } from "@/lib/utils";
import { pathFor } from "@/lib/session";
import { stockMovementCreates, applyStockLedger } from "@/lib/stock";
import { revalidateSession } from "@/lib/revalidate";
import type { ActionState } from "@/lib/actions/auth";

async function nextPurchaseRef() {
  const count = await prisma.purchaseOrder.count();
  return nextReference("ACH", count);
}

export async function createPurchaseOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActiveUser();
  const supplierId = String(formData.get("supplierId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const lines = parseLines(formData.get("lines"));
  if (!supplierId) return { error: "Choisissez un fournisseur." };
  if (!lines.length) return { error: "Ajoutez au moins une ligne." };

  type PackagingRef = { id: string; productId: string };

  const packagings = await prisma.packaging.findMany({
    where: { id: { in: lines.map((l) => l.packagingId) } },
  });
  const packMap = new Map<string, PackagingRef>(
    packagings.map((packaging: PackagingRef) => [packaging.id, packaging]),
  );

  for (const line of lines) {
    const pack = packMap.get(line.packagingId);
    if (!pack || pack.productId !== line.productId) {
      return { error: "Conditionnement invalide sur une ligne." };
    }
  }

  const order = await prisma.purchaseOrder.create({
    data: {
      reference: await nextPurchaseRef(),
      supplierId,
      createdById: user.id,
      notes,
      status: "DRAFT",
      lines: {
        create: lines.map((line) => ({
          productId: line.productId,
          packagingId: line.packagingId,
          quantityPacks: Number(line.packs),
        })),
      },
    },
  });
  await writeAudit(user.id, "create_purchase", "PurchaseOrder", order.id);
  revalidateSession("/achats");
  revalidateSession("/commandes");
  revalidateSession("/approvisionnements");
  const returnTo = String(formData.get("returnTo") ?? "");
  if (returnTo === "commandes") {
    redirect(pathFor(user.role, "/commandes"));
  }
  if (returnTo === "approvisionnements") {
    redirect(pathFor(user.role, "/approvisionnements"));
  }
  redirect(pathFor(user.role, `/achats/${order.id}`));
}

export async function sendPurchaseOrderAction(formData: FormData) {
  const user = await requireActiveUser();
  const id = String(formData.get("id") ?? "");
  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) return;
  if (user.role === "VENDEUR" && order.createdById !== user.id) return;
  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "SENT" },
  });
  await writeAudit(user.id, "send_purchase", "PurchaseOrder", id);
  revalidateSession(`/achats/${id}`);
  revalidateSession("/achats");
  revalidateSession("/commandes");
  revalidateSession("/approvisionnements");
}

export async function cancelPurchaseOrderAction(formData: FormData) {
  const user = await requireActiveUser();
  const id = String(formData.get("id") ?? "");
  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order || order.status === "RECEIVED") return;
  if (user.role === "VENDEUR" && order.createdById !== user.id) return;
  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await writeAudit(user.id, "cancel_purchase", "PurchaseOrder", id);
  revalidateSession(`/achats/${id}`);
  revalidateSession("/commandes");
  revalidateSession("/approvisionnements");
}

export async function receivePurchaseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRoles(["ADMIN", "GERANT", "VENDEUR"]);
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: { lines: { include: { packaging: true } } },
  });
  if (!order || order.status === "CANCELLED" || order.status === "RECEIVED") {
    return { error: "Cette commande ne peut plus être réceptionnée." };
  }

  type OrderLine = {
    id: string;
    productId: string;
    packagingId: string;
    quantityPacks: number;
    packaging: { unitsPerPack: number };
  };

  const receivedLines = (order.lines as OrderLine[])
    .map((line) => ({
      line,
      packs: Number(formData.get(`recv_${line.id}`) || 0),
      productId: String(formData.get(`product_${line.id}`) || line.productId),
      packagingId: String(formData.get(`packaging_${line.id}`) || line.packagingId),
    }))
    .filter((entry) => entry.packs > 0);

  if (!receivedLines.length) {
    return { error: "Indiquez au moins une quantité reçue." };
  }

  const packagings = await prisma.packaging.findMany({
    where: { id: { in: receivedLines.map((entry) => entry.packagingId) } },
  });
  const packMap = new Map(
    packagings.map((packaging) => [packaging.id, packaging]),
  );

  for (const entry of receivedLines) {
    const pack = packMap.get(entry.packagingId);
    if (!pack || pack.productId !== entry.productId) {
      return { error: "Conditionnement invalide sur une ligne." };
    }
  }

  const receipt = await prisma.goodsReceipt.create({
    data: {
      orderId,
      receivedById: user.id,
      notes: String(formData.get("notes") ?? "").trim(),
      lines: {
        create: receivedLines.map((entry) => ({
          productId: entry.productId,
          packagingId: entry.packagingId,
          quantityPacks: entry.packs,
        })),
      },
    },
  });

  const movements = await stockMovementCreates(
    receivedLines.map((entry) => {
      const pack = packMap.get(entry.packagingId)!;
      return {
        productId: entry.productId,
        quantityUnits: entry.packs * pack.unitsPerPack,
        type: "IN" as const,
        referenceType: "goods_receipt",
        referenceId: receipt.id,
        createdById: user.id,
        notes: `Réception ${order.reference}`,
      };
    }),
  );
  await prisma.stockMovement.createMany({ data: movements.creates });
  await applyStockLedger(movements.ledger);

  const allReceipts = await prisma.goodsReceipt.findMany({
    where: { orderId },
    include: { lines: true },
  });
  const receivedByLine = new Map<string, number>();
  for (const rec of allReceipts) {
    for (const line of rec.lines) {
      const key = `${line.productId}:${line.packagingId}`;
      receivedByLine.set(key, (receivedByLine.get(key) ?? 0) + line.quantityPacks);
    }
  }
  const complete =
    receivedLines.length === (order.lines as OrderLine[]).length ||
    (order.lines as OrderLine[]).every((line) => {
      const key = `${line.productId}:${line.packagingId}`;
      return (receivedByLine.get(key) ?? 0) >= line.quantityPacks;
    });

  await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: complete ? "RECEIVED" : "PARTIALLY_RECEIVED" },
  });
  await writeAudit(user.id, "receive_purchase", "GoodsReceipt", receipt.id);
  revalidateSession(`/achats/${orderId}`);
  revalidateSession("/commandes");
  revalidateSession("/approvisionnements");
  revalidateSession("/stock");
  revalidateSession("/");
  return { success: "Réception enregistrée, stock mis à jour." };
}
