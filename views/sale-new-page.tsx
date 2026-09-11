import { SaleForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { PackagingType } from "@/lib/types";

type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  packagings: { id: string; type: PackagingType; unitsPerPack: number }[];
};

export default async function NewSalePage() {
  await requireActiveUser();
  const products = (await prisma.product.findMany({
    where: { active: true },
    include: { packagings: true },
    orderBy: { name: "asc" },
  })) as CatalogProduct[];

  return (
    <div>
      <PageHeader
        eyebrow="Vente"
        title="Nouvelle commande client"
        description="Le stock n'est décrémenté qu'à la livraison effective."
      />
      <Card>
        {products.length === 0 ? (
          <p className="text-sm text-stone-600">Aucune boisson active au catalogue.</p>
        ) : (
          <SaleForm products={products} />
        )}
      </Card>
    </div>
  );
}
