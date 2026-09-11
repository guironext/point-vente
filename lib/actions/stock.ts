"use server";

import { prisma } from "@/lib/db";
import { requireRoles, writeAudit } from "@/lib/auth";
import { revalidateSession } from "@/lib/revalidate";
import type { ActionState } from "@/lib/actions/auth";

export async function adjustStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRoles(["ADMIN", "GERANT"]);
  const productId = String(formData.get("productId") ?? "");
  const quantityUnits = Number(formData.get("quantityUnits"));
  const notes = String(formData.get("notes") ?? "").trim();
  if (!productId || !quantityUnits) {
    return { error: "Produit et quantité (positive ou négative) requis." };
  }
  const movement = await prisma.stockMovement.create({
    data: {
      productId,
      quantityUnits,
      type: "ADJUST",
      referenceType: "adjustment",
      referenceId: `adj-${Date.now()}`,
      notes: notes || "Ajustement manuel",
      createdById: user.id,
    },
  });
  await writeAudit(user.id, "adjust_stock", "StockMovement", movement.id);
  revalidateSession("/stock");
  return { success: "Ajustement de stock enregistré." };
}
