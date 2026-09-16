import { ProductForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

type ProductEdit = {
  id: string;
  name: string;
  brand: string;
  volume: string;
  unitPurchasePrice: number;
  unitSalePrice: number;
  lowStockThreshold: number;
  active: boolean;
  supplierId: string | null;
  packagings: { type: "CASIER" | "CARTON"; unitsPerPack: number }[];
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRoles(["ADMIN", "GERANT"]);
  const { id } = await params;
  const found = await prisma.product.findUnique({
    where: { id },
    include: { packagings: true },
  });
  if (!found) notFound();
  const product = found as ProductEdit;
  const suppliers = await prisma.supplier.findMany({
    where: product.supplierId
      ? { OR: [{ active: true }, { id: product.supplierId }] }
      : { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title={`${product.brand} ${product.name}`}
        description="Mise à jour des prix, du fournisseur et du seuil d'alerte."
      />
      <Card>
        <ProductForm
          suppliers={suppliers}
          product={{
            id: product.id,
            name: product.name,
            brand: product.brand,
            volume: product.volume,
            unitPurchasePrice: product.unitPurchasePrice,
            unitSalePrice: product.unitSalePrice,
            lowStockThreshold: product.lowStockThreshold,
            active: product.active,
            supplierId: product.supplierId,
            casierUnits:
              product.packagings.find((pack) => pack.type === "CASIER")?.unitsPerPack ?? 0,
            cartonUnits:
              product.packagings.find((pack) => pack.type === "CARTON")?.unitsPerPack ?? 0,
          }}
        />
      </Card>
    </div>
  );
}
