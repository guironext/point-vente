import { AdjustStockForm } from "@/components/forms";
import { Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAdjustStock } from "@/lib/permissions";
import { getStockByProduct } from "@/lib/stock";
import { describeUnits, formatDate } from "@/lib/utils";
import type { PackagingType } from "@/lib/types";

type StockProduct = {
  id: string;
  name: string;
  brand: string;
  volume: string;
  lowStockThreshold: number;
  packagings: { type: PackagingType; unitsPerPack: number }[];
};

type StockMove = {
  id: string;
  type: string;
  quantityUnits: number;
  notes: string;
  createdAt: Date;
  product: { brand: string; name: string };
};

export default async function StockPage() {
  const user = await requireActiveUser();
  const products = (await prisma.product.findMany({
    where: { active: true },
    include: { packagings: true },
    orderBy: { name: "asc" },
  })) as StockProduct[];
  const stock = await getStockByProduct(products.map((product) => product.id));
  const movements = (await prisma.stockMovement.findMany({
    include: { product: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  })) as StockMove[];

  return (
    <div>
      <PageHeader
        eyebrow="Inventaire"
        title="Stock des boissons"
        description="Entrant après réception, vendu à la livraison, restant en unités et en colis."
      />
      {canAdjustStock(user.role) ? (
        <Card className="mb-6">
          <h2 className="display mb-4 text-xl text-brand">Ajustement</h2>
          <AdjustStockForm products={products} />
        </Card>
      ) : null}
      <Card className="mb-6">
        <Table>
          <thead>
            <tr>
              <Th>Boisson</Th>
              <Th>Entrant</Th>
              <Th>Vendu</Th>
              <Th>Restant</Th>
              <Th>En colis</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const snap = stock.get(product.id) ?? {
                incoming: 0,
                sold: 0,
                remaining: 0,
              };
              const low = snap.remaining <= product.lowStockThreshold;
              return (
                <tr key={product.id}>
                  <Td>
                    <div className="font-semibold">
                      {product.brand} {product.name}
                    </div>
                    <div className="text-xs text-stone-500">{product.volume}</div>
                  </Td>
                  <Td>{snap.incoming} u.</Td>
                  <Td>{snap.sold} u.</Td>
                  <Td className="font-semibold">{snap.remaining} u.</Td>
                  <Td>{describeUnits(snap.remaining, product.packagings)}</Td>
                  <Td>
                    {low ? <Badge tone="warning">Seuil</Badge> : null}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      <Card>
        <h2 className="display mb-4 text-xl text-brand">Derniers mouvements</h2>
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Boisson</Th>
              <Th>Type</Th>
              <Th>Unités</Th>
              <Th>Note</Th>
            </tr>
          </thead>
          <tbody>
            {movements.map((move) => (
              <tr key={move.id}>
                <Td>{formatDate(move.createdAt)}</Td>
                <Td>
                  {move.product.brand} {move.product.name}
                </Td>
                <Td>{move.type}</Td>
                <Td>{move.quantityUnits > 0 ? `+${move.quantityUnits}` : move.quantityUnits}</Td>
                <Td>{move.notes}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
