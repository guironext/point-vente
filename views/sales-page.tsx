import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th, buttonClass } from "@/components/ui";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ordersSuffix, pathFor } from "@/lib/session";
import { invoiceStatus, paymentStatusLabels, saleStatusLabels } from "@/lib/labels";
import { formatDate, formatMoney, orderAmount, paymentsTotal } from "@/lib/utils";
import type { CustomerOrderStatus } from "@/lib/types";

type SaleRow = {
  id: string;
  reference: string;
  customerName: string;
  customerContact: string;
  status: CustomerOrderStatus;
  createdAt: Date;
  lines: {
    quantityPacks: number;
    unitPrice: number;
    packaging: { unitsPerPack: number };
  }[];
  payments: { amount: number }[];
};

function saleTone(status: CustomerOrderStatus) {
  if (status === "DELIVERED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "OUT_FOR_DELIVERY") return "warning" as const;
  return "info" as const;
}

export default async function SalesPage({
  newButtonLabel = "Nouvelle commande",
}: {
  newButtonLabel?: string;
} = {}) {
  const user = await requireActiveUser();
  const ordersBase = ordersSuffix(user.role);
  const orders = (await prisma.customerOrder.findMany({
    where: user.role === "VENDEUR" ? { createdById: user.id } : undefined,
    include: {
      lines: { include: { packaging: true } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  })) as SaleRow[];

  return (
    <div>
      <PageHeader
        eyebrow="Point de vente"
        title="Commandes clients"
        description="Prenez la commande, livrez les boissons, puis encaissez (total ou partiel)."
        actions={
          <Link href={pathFor(user.role, `${ordersBase}/nouvelle`)} className={buttonClass()}>
            {newButtonLabel}
          </Link>
        }
      />
      <Card>
        {orders.length === 0 ? (
          <EmptyState
            title="Aucune vente"
            description="Enregistrez une commande client pour démarrer."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Réf.</Th>
                <Th>Client</Th>
                <Th>Montant</Th>
                <Th>Paiement</Th>
                <Th>Statut</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const total = orderAmount(order.lines);
                const paid = paymentsTotal(order.payments);
                const pay = invoiceStatus(paid, total);
                return (
                  <tr key={order.id}>
                    <Td>
                      <Link href={pathFor(user.role, `${ordersBase}/${order.id}`)} className="font-semibold text-brand">
                        {order.reference}
                      </Link>
                    </Td>
                    <Td>
                      <div>{order.customerName}</div>
                      <div className="text-xs text-stone-500">{order.customerContact}</div>
                    </Td>
                    <Td>{formatMoney(total)}</Td>
                    <Td>
                      <Badge
                        tone={
                          pay === "PAID" ? "success" : pay === "PARTIAL" ? "warning" : "danger"
                        }
                      >
                        {paymentStatusLabels[pay]}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={saleTone(order.status)}>
                        {saleStatusLabels[order.status]}
                      </Badge>
                    </Td>
                    <Td>{formatDate(order.createdAt)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
