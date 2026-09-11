import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, Input, Label, PageHeader, Button } from "@/components/ui";
import { updateProductAction } from "@/lib/actions/catalog";

type ProductEdit = {
  id: string;
  name: string;
  brand: string;
  volume: string;
  unitPurchasePrice: number;
  unitSalePrice: number;
  lowStockThreshold: number;
  active: boolean;
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

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title={`${product.brand} ${product.name}`}
        description="Mise à jour des prix et du seuil d'alerte. Les conditionnements restent liés à la boisson."
      />
      <Card>
        <form action={updateProductAction} className="space-y-4">
          <input type="hidden" name="id" value={product.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Nom</Label>
              <Input name="name" defaultValue={product.name} />
            </div>
            <div>
              <Label>Marque</Label>
              <Input name="brand" defaultValue={product.brand} />
            </div>
            <div>
              <Label>Volume</Label>
              <Input name="volume" defaultValue={product.volume} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Prix d&apos;achat</Label>
              <Input
                name="unitPurchasePrice"
                type="number"
                defaultValue={product.unitPurchasePrice}
              />
            </div>
            <div>
              <Label>Prix de vente</Label>
              <Input
                name="unitSalePrice"
                type="number"
                defaultValue={product.unitSalePrice}
              />
            </div>
            <div>
              <Label>Seuil</Label>
              <Input
                name="lowStockThreshold"
                type="number"
                defaultValue={product.lowStockThreshold}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={product.active} />
            Boisson active
          </label>
          <Button>Enregistrer</Button>
        </form>
      </Card>
    </div>
  );
}
