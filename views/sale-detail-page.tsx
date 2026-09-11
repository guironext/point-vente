import { notFound } from "next/navigation";
import { CustomerPaymentForm, DeliverForm } from "@/components/forms";
import { Badge, Button, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { cancelSaleAction, startDeliveryAction } from "@/lib/actions/sales";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  invoiceStatus,
  packagingLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  saleStatusLabels,
} from "@/lib/labels";
import { formatDate, formatMoney, fullName, orderAmount, paymentsTotal } from "@/lib/utils";
import type {
  CustomerOrderStatus,
  PackagingType,
  PaymentMethod,
} from "@/lib/types";

type SaleLine = {
  id: string;
  quantityPacks: number;
  unitPrice: number;
  product: { brand: string; name: string };
  packaging: { type: PackagingType; unitsPerPack: number };
};

type SaleDetail = {
  id: string;
  reference: string;
  status: CustomerOrderStatus;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  createdById: string;
  createdAt: Date;
  deliveredAt: Date | null;
  createdBy: { firstName: string; lastName: string };
  deliveredBy: { firstName: string; lastName: string } | null;
  lines: SaleLine[];
  payments: {
    id: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
  }[];
};

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireActiveUser();
  const { id } = await params;
  const found = await prisma.customerOrder.findUnique({
    where: { id },
    include: {
      createdBy: true,
      deliveredBy: true,
      lines: { include: { product: true, packaging: true } },
      payments: { include: { createdBy: true } },
    },
  });
  if (!found) notFound();
  const order = found as SaleDetail;
  if (user.role === "VENDEUR" && order.createdById !== user.id) notFound();

  const total = orderAmount(order.lines);
  const paid = paymentsTotal(order.payments);
  const remaining = total - paid;
  const pay = invoiceStatus(paid, total);

  return (
    <div>
      <PageHeader
        eyebrow={order.reference}
        title={order.customerName}
        description={`${order.customerContact}${order.customerAddress ? ` · ${order.customerAddress}` : ""}`}
        actions={
          <div className="flex gap-2">
            <Badge
              tone={
                order.status === "DELIVERED"
                  ? "success"
                  : order.status === "CANCELLED"
                    ? "danger"
                    : "warning"
              }
            >
              {saleStatusLabels[order.status]}
            </Badge>
            <Badge
              tone={pay === "PAID" ? "success" : pay === "PARTIAL" ? "warning" : "danger"}
            >
              {paymentStatusLabels[pay]}
            </Badge>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {order.status === "CONFIRMED" ? (
          <form action={startDeliveryAction}>
            <input type="hidden" name="id" value={order.id} />
            <Button variant="secondary">Partir en livraison</Button>
          </form>
        ) : null}
        {order.status === "CONFIRMED" || order.status === "OUT_FOR_DELIVERY" ? (
          <DeliverForm orderId={order.id} />
        ) : null}
        {order.status !== "DELIVERED" && order.status !== "CANCELLED" ? (
          <form action={cancelSaleAction}>
            <input type="hidden" name="id" value={order.id} />
            <Button variant="danger">Annuler</Button>
          </form>
        ) : null}
      </div>

      <Card className="mb-6">
        <h2 className="display mb-4 text-xl text-brand">Lignes</h2>
        <Table>
          <thead>
            <tr>
              <Th>Boisson</Th>
              <Th>Colis</Th>
              <Th>Unités</Th>
              <Th>P.U.</Th>
              <Th>Montant</Th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => {
              const units = line.quantityPacks * line.packaging.unitsPerPack;
              return (
                <tr key={line.id}>
                  <Td>
                    {line.product.brand} {line.product.name}
                  </Td>
                  <Td>
                    {line.quantityPacks} {packagingLabels[line.packaging.type].toLowerCase()}
                    {line.quantityPacks > 1 ? "s" : ""}
                  </Td>
                  <Td>{units}</Td>
                  <Td>{formatMoney(line.unitPrice)}</Td>
                  <Td>{formatMoney(units * line.unitPrice)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <p className="mt-4 text-right text-lg font-semibold text-brand">
          Total {formatMoney(total)}
        </p>
        {order.deliveredAt && order.deliveredBy ? (
          <p className="mt-2 text-sm text-stone-500">
            Livré le {formatDate(order.deliveredAt)} par {fullName(order.deliveredBy)}
          </p>
        ) : (
          <p className="mt-2 text-sm text-stone-500">
            Prise par {fullName(order.createdBy)} le {formatDate(order.createdAt)}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="display mb-4 text-xl text-brand">Paiement client</h2>
        {order.payments.length > 0 ? (
          <ul className="mb-4 space-y-1 text-sm text-stone-600">
            {order.payments.map((payment) => (
              <li key={payment.id}>
                {formatMoney(payment.amount)} · {paymentMethodLabels[payment.method]} ·{" "}
                {formatDate(payment.paidAt)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-stone-500">Aucun encaissement pour l&apos;instant.</p>
        )}
        {remaining > 0 && order.status !== "CANCELLED" ? (
          <CustomerPaymentForm orderId={order.id} remaining={remaining} />
        ) : (
          <p className="text-sm font-semibold text-emerald-800">Soldée</p>
        )}
      </Card>
    </div>
  );
}
