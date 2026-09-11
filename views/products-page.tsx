import { ProductForm } from "@/components/forms";
import {
  Badge,
  Card,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pathFor } from "@/lib/session";
import { packagingLabels } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { getStockByProduct } from "@/lib/stock";
import Link from "next/link";
import type { PackagingType } from "@/lib/types";

type ProductRow = {
  id: string;
  name: string;
  brand: string;
  volume: string;
  unitPurchasePrice: number;
  unitSalePrice: number;
  active: boolean;
  packagings: { type: PackagingType; unitsPerPack: number }[];
};

export default async function ProductsPage() {
  const user = await requireRoles(["ADMIN", "GERANT"]);
  const products = (await prisma.product.findMany({
    include: { packagings: true },
    orderBy: { name: "asc" },
  })) as ProductRow[];
  const stock = await getStockByProduct(products.map((product) => product.id));

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Boissons"
        description="Chaque boisson se compte en unités. Casier et carton sont des conditionnements."
      />
      <Card className="mb-6">
        <h2 className="display mb-4 text-xl text-brand">Ajouter une boisson</h2>
        <ProductForm />
      </Card>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Boisson</Th>
              <Th>Conditionnements</Th>
              <Th>Achat / Vente</Th>
              <Th>Stock</Th>
              <Th>État</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <Td>
                  <Link href={pathFor(user.role, `/produits/${product.id}`)} className="font-semibold text-brand">
                    {product.brand} {product.name}
                  </Link>
                  <div className="text-xs text-stone-500">{product.volume}</div>
                </Td>
                <Td>
                  {product.packagings
                    .map(
                      (pack) =>
                        `${packagingLabels[pack.type]} × ${pack.unitsPerPack}`,
                    )
                    .join(" · ")}
                </Td>
                <Td>
                  {formatMoney(product.unitPurchasePrice)} / {formatMoney(product.unitSalePrice)}
                </Td>
                <Td>{stock.get(product.id)?.remaining ?? 0} u.</Td>
                <Td>
                  <Badge tone={product.active ? "success" : "neutral"}>
                    {product.active ? "Active" : "Inactive"}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
