"use server";

import type { PackagingType } from "@/lib/types";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { revalidateSession } from "@/lib/revalidate";
import type { ActionState } from "@/lib/actions/auth";

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRoles(["ADMIN", "GERANT"]);
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const volume = String(formData.get("volume") ?? "").trim();
  const unitPurchasePrice = Number(formData.get("unitPurchasePrice"));
  const unitSalePrice = Number(formData.get("unitSalePrice"));
  const lowStockThreshold = Number(formData.get("lowStockThreshold") || 24);
  const casierUnits = Number(formData.get("casierUnits") || 0);
  const cartonUnits = Number(formData.get("cartonUnits") || 0);

  if (!name || !brand || !volume) return { error: "Nom, marque et volume requis." };
  if (!unitPurchasePrice || !unitSalePrice) {
    return { error: "Les prix d'achat et de vente sont requis." };
  }
  if (casierUnits <= 0 && cartonUnits <= 0) {
    return { error: "Indiquez au moins un conditionnement (casier ou carton)." };
  }

  const packagings: { type: PackagingType; unitsPerPack: number }[] = [];
  if (casierUnits > 0) packagings.push({ type: "CASIER", unitsPerPack: casierUnits });
  if (cartonUnits > 0) packagings.push({ type: "CARTON", unitsPerPack: cartonUnits });

  await prisma.product.create({
    data: {
      name,
      brand,
      volume,
      unitPurchasePrice,
      unitSalePrice,
      lowStockThreshold,
      packagings: { create: packagings },
    },
  });
  revalidateSession("/produits");
  return { success: "Boisson ajoutée au catalogue." };
}

export async function updateProductAction(formData: FormData) {
  await requireRoles(["ADMIN", "GERANT"]);
  const id = String(formData.get("id") ?? "");
  await prisma.product.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      brand: String(formData.get("brand") ?? "").trim(),
      volume: String(formData.get("volume") ?? "").trim(),
      unitPurchasePrice: Number(formData.get("unitPurchasePrice")),
      unitSalePrice: Number(formData.get("unitSalePrice")),
      lowStockThreshold: Number(formData.get("lowStockThreshold") || 24),
      active: formData.get("active") === "on",
    },
  });
  revalidateSession("/produits");
  revalidateSession(`/produits/${id}`);
}

export async function createSupplierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRoles(["ADMIN", "GERANT"]);
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  if (!name || !contact) return { error: "Nom et contact du fournisseur requis." };
  await prisma.supplier.create({
    data: {
      name,
      contact,
      address: String(formData.get("address") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
    },
  });
  revalidateSession("/fournisseurs");
  return { success: "Fournisseur enregistré." };
}
