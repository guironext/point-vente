import { NewCommandeButton } from "@/components/new-commande-form";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { packagingLabels, purchaseStatusLabels } from "@/lib/labels";
import { pathFor } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import type { PackagingType, PurchaseOrderStatus } from "@/lib/types";
import Link from "next/link";

type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  packagings: { id: string; type: PackagingType; unitsPerPack: number }[];
};

type CommandeRow = {
  id: string;
  reference: string;
  status: PurchaseOrderStatus;
  orderedAt: Date;
  supplier: { name: string };
  lines: {
    quantityPacks: number;
    product: { name: string; brand: string };
    packaging: { type: PackagingType; unitsPerPack: number };
  }[];
};

function tone(status: PurchaseOrderStatus) {
  if (status === "RECEIVED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "PARTIALLY_RECEIVED" || status === "SENT") return "warning" as const;
  return "neutral" as const;
}

export default async function CommandesPage() {
  const user = await requireRoles(["ADMIN", "GERANT"]);
  const [orders, suppliers, products] = (await Promise.all([
    prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        lines: { include: { product: true, packaging: true } },
      },
      orderBy: { orderedAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      include: { packagings: true },
      orderBy: { name: "asc" },
    }),
  ])) as [CommandeRow[], { id: string; name: string }[], CatalogProduct[]];

  return (
    <div>
      <PageHeader
        eyebrow="Approvisionnement"
        title="Commandes"
        description="Créez une commande fournisseur (casiers ou cartons), puis suivez-la ici."
        actions={
          <NewCommandeButton suppliers={suppliers} products={products} />
        }
      />
      <Card>
        {orders.length === 0 ? (
          <EmptyState
            title="Aucune commande"
            description="Utilisez « Nouvelle Commande » pour enregistrer un achat auprès d'un fournisseur."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Référence</Th>
                <Th>Fournisseur</Th>
                <Th>Produits</Th>
                <Th>Date</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <Td>
                    <Link
                      href={pathFor(user.role, `/achats/${order.id}`)}
                      className="font-semibold text-brand"
                    >
                      {order.reference}
                    </Link>
                  </Td>
                  <Td>{order.supplier.name}</Td>
                  <Td>
                    <ul className="space-y-1">
                      {order.lines.map((line, index) => (
                        <li key={`${order.id}-${index}`} className="text-sm">
                          {line.product.brand} {line.product.name}
                          <span className="block text-xs text-stone-500">
                            {line.quantityPacks}{" "}
                            {packagingLabels[line.packaging.type].toLowerCase()}
                            {line.quantityPacks > 1 ? "s" : ""} ·{" "}
                            {line.packaging.unitsPerPack} u.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Td>
                  <Td>{formatDate(order.orderedAt)}</Td>
                  <Td>
                    <Badge tone={tone(order.status)}>
                      {purchaseStatusLabels[order.status]}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
