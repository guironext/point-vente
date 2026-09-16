import {
  ProductsWorkspace,
  type ProductCard,
} from "@/components/products-workspace";
import { PageHeader, StatCard } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStockByProduct } from "@/lib/stock";
import type { PackagingType } from "@/lib/types";

type ProductRow = {
  id: string;
  name: string;
  brand: string;
  volume: string;
  unitPurchasePrice: number;
  unitSalePrice: number;
  lowStockThreshold: number;
  active: boolean;
  supplierId: string | null;
  packagings: { type: PackagingType; unitsPerPack: number }[];
  supplier: { name: string } | null;
  _count: {
    purchaseLines: number;
    receiptLines: number;
    stockMovements: number;
    saleLines: number;
  };
};

export default async function ProductsPage() {
  await requireRoles(["ADMIN", "GERANT"]);
  const [rows, suppliers] = (await Promise.all([
    prisma.product.findMany({
      include: {
        packagings: true,
        supplier: { select: { name: true } },
        _count: {
          select: {
            purchaseLines: true,
            receiptLines: true,
            stockMovements: true,
            saleLines: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])) as unknown as [ProductRow[], { id: string; name: string }[]];
  const stock = await getStockByProduct(rows.map((product) => product.id));

  const products: ProductCard[] = rows.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    volume: product.volume,
    unitPurchasePrice: product.unitPurchasePrice,
    unitSalePrice: product.unitSalePrice,
    lowStockThreshold: product.lowStockThreshold,
    active: product.active,
    remaining: stock.get(product.id)?.remaining ?? 0,
    supplierId: product.supplierId,
    supplierName: product.supplier?.name ?? null,
    packagings: product.packagings,
    linkedCount:
      product._count.purchaseLines +
      product._count.receiptLines +
      product._count.stockMovements +
      product._count.saleLines,
  }));

  const active = products.filter((product) => product.active).length;
  const low = products.filter(
    (product) => product.remaining <= product.lowStockThreshold,
  ).length;
  const linkedSuppliers = new Set(
    products.map((product) => product.supplierName).filter(Boolean),
  ).size;

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Boissons"
        description="Chaque boisson se compte en unités. Casier et carton sont des conditionnements."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Boissons" value={String(products.length)} />
        <StatCard label="Actives" value={String(active)} />
        <StatCard
          label="Stock bas"
          value={String(low)}
          alert={low > 0}
          hint="Sous le seuil d'alerte"
        />
        <StatCard
          label="Fournisseurs"
          value={String(linkedSuppliers)}
          hint="Liés au catalogue"
        />
      </div>

      <ProductsWorkspace products={products} suppliers={suppliers} />
    </div>
  );
}
