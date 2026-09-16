import type { ReactNode } from "react";
import { PackageCheck, PackageOpen } from "lucide-react";
import { LivraisonButton } from "@/components/livraison-button";
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
import { formatDate, fullName } from "@/lib/utils";
import type { PackagingType, PurchaseOrderStatus, Role } from "@/lib/types";
import Link from "next/link";

type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  packagings: { id: string; type: PackagingType; unitsPerPack: number }[];
};

type ApprovisionnementRow = {
  id: string;
  reference: string;
  status: PurchaseOrderStatus;
  orderedAt: Date;
  supplier: { name: string; contact: string };
  createdBy: { firstName: string; lastName: string };
  lines: {
    id: string;
    productId: string;
    packagingId: string;
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

export default async function ApprovisionnementsPage() {
  const user = await requireRoles(["ADMIN", "GERANT", "VENDEUR"]);
  const [orders, suppliers, products] = (await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { status: { in: ["DRAFT", "RECEIVED"] } },
      include: {
        supplier: true,
        createdBy: { select: { firstName: true, lastName: true } },
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
  ])) as [ApprovisionnementRow[], { id: string; name: string }[], CatalogProduct[]];

  const draftOrders = orders.filter((order) => order.status === "DRAFT");
  const receivedOrders = orders.filter((order) => order.status === "RECEIVED");

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow="Approvisionnement"
        title="Approvisionnements"
        description="Enregistrez un achat fournisseur, puis suivez les commandes en cours et livrées."
      />

      <div className="mb-6">
        <NewCommandeButton
          suppliers={suppliers}
          products={products}
          label="Nouvel Approvisionnement"
          title="Nouvel approvisionnement"
          returnTo="approvisionnements"
          submitLabel="Créer l'approvisionnement"
        />
      </div>

      <Card className="mb-6">
        <SectionTitle
          icon={<PackageOpen className="h-4 w-4" />}
          title="Commande en cours"
          count={draftOrders.length}
        />
        <OrdersTable
          orders={draftOrders}
          role={user.role}
          showLivraison
          products={products}
          emptyTitle="Aucune commande en cours"
          emptyDescription="Les approvisionnements au statut brouillon apparaîtront ici."
        />
      </Card>

      <Card>
        <SectionTitle
          icon={<PackageCheck className="h-4 w-4" />}
          title="Commande Livrée"
          count={receivedOrders.length}
        />
        <OrdersTable
          orders={receivedOrders}
          role={user.role}
          emptyTitle="Aucune commande livrée"
          emptyDescription="Les approvisionnements reçus apparaîtront ici."
        />
      </Card>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  count,
}: {
  icon: ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
          {icon}
        </span>
        <h2 className="display text-lg text-brand sm:text-xl">{title}</h2>
      </div>
      <Badge>{count}</Badge>
    </div>
  );
}

function OrdersTable({
  orders,
  role,
  emptyTitle,
  emptyDescription,
  showLivraison = false,
  products = [],
}: {
  orders: ApprovisionnementRow[];
  role: Role;
  emptyTitle: string;
  emptyDescription: string;
  showLivraison?: boolean;
  products?: CatalogProduct[];
}) {
  if (orders.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Référence</Th>
          <Th>Fournisseur</Th>
          <Th>Produits</Th>
          <Th>Créé par</Th>
          <Th>Date</Th>
          <Th>Statut</Th>
          {showLivraison ? <Th></Th> : null}
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <Td>
              <Link
                href={pathFor(role, `/approvisionnements/${order.id}`)}
                className="font-semibold text-brand"
              >
                {order.reference}
              </Link>
            </Td>
            <Td>
              <span className="block">{order.supplier.name}</span>
              {order.supplier.contact ? (
                <span className="text-xs text-stone-500">{order.supplier.contact}</span>
              ) : null}
            </Td>
            <Td>
              <ul className="space-y-1">
                {order.lines.map((line) => (
                  <li key={line.id} className="text-sm">
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
            <Td>{fullName(order.createdBy)}</Td>
            <Td>{formatDate(order.orderedAt)}</Td>
            <Td>
              <Badge tone={tone(order.status)}>
                {purchaseStatusLabels[order.status]}
              </Badge>
            </Td>
            {showLivraison ? (
              <Td>
                <LivraisonButton
                  products={products}
                  order={{
                    id: order.id,
                    reference: order.reference,
                    supplierName: order.supplier.name,
                    lines: order.lines,
                  }}
                />
              </Td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
