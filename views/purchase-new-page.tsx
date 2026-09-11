import { PurchaseForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { PackagingType } from "@/lib/types";

type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  packagings: { id: string; type: PackagingType; unitsPerPack: number }[];
};

export default async function NewPurchasePage() {
  await requireRoles(["ADMIN", "GERANT"]);
  const [suppliers, products] = (await Promise.all([
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true },
      include: { packagings: true },
      orderBy: { name: "asc" },
    }),
  ])) as [{ id: string; name: string }[], CatalogProduct[]];

  return (
    <div>
      <PageHeader
        eyebrow="Approvisionnement"
        title="Nouvelle commande fournisseur"
        description="Indiquez les casiers ou cartons à commander. Le stock n'augmente qu'à la réception."
      />
      <Card>
        {suppliers.length === 0 || products.length === 0 ? (
          <p className="text-sm text-stone-600">
            Ajoutez d&apos;abord un fournisseur et au moins une boisson.
          </p>
        ) : (
          <PurchaseForm suppliers={suppliers} products={products} />
        )}
      </Card>
    </div>
  );
}
