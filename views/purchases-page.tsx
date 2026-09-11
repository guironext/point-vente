import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th, buttonClass } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pathFor } from "@/lib/session";
import { purchaseStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { PurchaseOrderStatus } from "@/lib/types";

type PurchaseRow = {
  id: string;
  reference: string;
  status: PurchaseOrderStatus;
  orderedAt: Date;
  supplier: { name: string };
  lines: unknown[];
};

function tone(status: PurchaseOrderStatus) {
  if (status === "RECEIVED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "PARTIALLY_RECEIVED" || status === "SENT") return "warning" as const;
  return "neutral" as const;
}

export default async function PurchasesPage() {
  const user = await requireRoles(["ADMIN", "GERANT"]);
  const orders = (await prisma.purchaseOrder.findMany({
    include: { supplier: true, lines: true },
    orderBy: { orderedAt: "desc" },
  })) as PurchaseRow[];

  return (
    <div>
      <PageHeader
        eyebrow="Approvisionnement"
        title="Commandes fournisseurs"
        description="Passez commande en casiers ou cartons, puis réceptionnez pour alimenter le stock."
        actions={
          <Link href={pathFor(user.role, "/achats/nouvelle")} className={buttonClass()}>
            Nouvelle commande
          </Link>
        }
      />
      <Card>
        {orders.length === 0 ? (
          <EmptyState
            title="Aucune commande"
            description="Créez une première commande auprès d'un fournisseur."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Référence</Th>
                <Th>Fournisseur</Th>
                <Th>Lignes</Th>
                <Th>Date</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <Td>
                    <Link href={pathFor(user.role, `/achats/${order.id}`)} className="font-semibold text-brand">
                      {order.reference}
                    </Link>
                  </Td>
                  <Td>{order.supplier.name}</Td>
                  <Td>{order.lines.length}</Td>
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
