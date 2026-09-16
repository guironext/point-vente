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
  const supplierId = String(formData.get("supplierId") ?? "").trim();
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

  if (supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) return { error: "Fournisseur introuvable." };
  }

  await prisma.product.create({
    data: {
      name,
      brand,
      volume,
      unitPurchasePrice,
      unitSalePrice,
      lowStockThreshold,
      supplierId: supplierId || undefined,
      packagings: { create: packagings },
    },
  });
  revalidateSession("/produits");
  return { success: "Boisson ajoutée au catalogue." };
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRoles(["ADMIN", "GERANT"]);
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const volume = String(formData.get("volume") ?? "").trim();
  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const unitPurchasePrice = Number(formData.get("unitPurchasePrice"));
  const unitSalePrice = Number(formData.get("unitSalePrice"));
  const lowStockThreshold = Number(formData.get("lowStockThreshold") || 24);
  const casierUnits = Number(formData.get("casierUnits") || 0);
  const cartonUnits = Number(formData.get("cartonUnits") || 0);

  if (!id) return { error: "Boisson introuvable." };
  if (!name || !brand || !volume) return { error: "Nom, marque et volume requis." };
  if (!unitPurchasePrice || !unitSalePrice) {
    return { error: "Les prix d'achat et de vente sont requis." };
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: "Boisson introuvable." };

  if (supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) return { error: "Fournisseur introuvable." };
  }

  await prisma.product.update({
    where: { id },
    data: {
      name,
      brand,
      volume,
      unitPurchasePrice,
      unitSalePrice,
      lowStockThreshold,
      supplierId: supplierId || null,
      active: formData.get("active") === "on",
    },
  });

  if (casierUnits > 0) {
    await prisma.packaging.upsert({
      where: { productId_type: { productId: id, type: "CASIER" } },
      update: { unitsPerPack: casierUnits },
      create: { productId: id, type: "CASIER", unitsPerPack: casierUnits },
    });
  }
  if (cartonUnits > 0) {
    await prisma.packaging.upsert({
      where: { productId_type: { productId: id, type: "CARTON" } },
      update: { unitsPerPack: cartonUnits },
      create: { productId: id, type: "CARTON", unitsPerPack: cartonUnits },
    });
  }

  revalidateSession("/produits");
  revalidateSession(`/produits/${id}`);
  return { success: "Boisson mise à jour." };
}

export async function deleteProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRoles(["ADMIN", "GERANT"]);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Boisson introuvable." };

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          purchaseLines: true,
          receiptLines: true,
          stockMovements: true,
          saleLines: true,
        },
      },
    },
  });
  if (!product) return { error: "Boisson introuvable." };

  const linked =
    product._count.purchaseLines +
    product._count.receiptLines +
    product._count.stockMovements +
    product._count.saleLines;
  if (linked > 0) {
    return {
      error:
        "Impossible de supprimer cette boisson : des commandes, ventes ou mouvements de stock y sont liés.",
    };
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    return {
      error:
        "Impossible de supprimer cette boisson : des commandes, ventes ou mouvements de stock y sont liés.",
    };
  }
  revalidateSession("/produits");
  revalidateSession(`/produits/${id}`);
  return { success: "Boisson supprimée." };
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

export async function updateSupplierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRoles(["ADMIN", "GERANT"]);
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  if (!id) return { error: "Fournisseur introuvable." };
  if (!name || !contact) return { error: "Nom et contact du fournisseur requis." };

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) return { error: "Fournisseur introuvable." };

  await prisma.supplier.update({
    where: { id },
    data: {
      name,
      contact,
      address: String(formData.get("address") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
      active: formData.get("active") === "on",
    },
  });
  revalidateSession("/fournisseurs");
  return { success: "Fournisseur mis à jour." };
}

export async function deleteSupplierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRoles(["ADMIN", "GERANT"]);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Fournisseur introuvable." };

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { purchaseOrders: true, invoices: true } } },
  });
  if (!supplier) return { error: "Fournisseur introuvable." };

  if (supplier._count.purchaseOrders > 0 || supplier._count.invoices > 0) {
    return {
      error:
        "Impossible de supprimer ce fournisseur : des commandes ou factures y sont liées.",
    };
  }

  try {
    await prisma.supplier.delete({ where: { id } });
  } catch {
    return {
      error:
        "Impossible de supprimer ce fournisseur : des commandes ou factures y sont liées.",
    };
  }
  revalidateSession("/fournisseurs");
  return { success: "Fournisseur supprimé." };
}
