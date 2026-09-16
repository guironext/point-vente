import { notFound } from "next/navigation";
import Link from "next/link";
import { FactureForm, type FactureProduct } from "@/components/facture-form";
import { FactureActions } from "@/components/facture-actions";
import { FactureDocument } from "@/components/facture-document";
import { CustomerPaymentForm } from "@/components/forms";
import { Badge, Card, PageHeader, buttonClass } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  invoiceStatus,
  paymentMethodLabels,
  paymentStatusLabels,
  saleStatusLabels,
} from "@/lib/labels";
import { pathFor } from "@/lib/session";
import { formatDate, formatMoney, invoiceTotals, paymentsTotal } from "@/lib/utils";
import type {
  CustomerOrderStatus,
  PackagingType,
  PaymentMethod,
} from "@/lib/types";

type FactureLine = {
  id: string;
  productId: string;
  packagingId: string;
  quantityPacks: number;
  unitPrice: number;
  product: { brand: string; name: string; volume: string };
  packaging: { type: PackagingType; unitsPerPack: number };
};

type FactureDetail = {
  id: string;
  reference: string;
  status: CustomerOrderStatus;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  notes: string;
  createdAt: Date;
  lines: FactureLine[];
  payments: {
    id: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
  }[];
};

export default async function FactureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRoles(["ADMIN", "GERANT", "VENDEUR"]);
  const { id } = await params;
  const [found, catalog, stockOut] = await Promise.all([
    prisma.customerOrder.findUnique({
      where: { id },
      include: {
        lines: { include: { product: true, packaging: true } },
        payments: { orderBy: { paidAt: "asc" } },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      include: { packagings: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findFirst({
      where: { referenceId: id, type: "OUT" },
      select: { id: true },
    }),
  ]);
  if (!found) notFound();
  const order = found as FactureDetail;
  const products = catalog as FactureProduct[];
  const { ttc } = invoiceTotals(order.lines);
  const paid = paymentsTotal(order.payments);
  const remaining = Math.max(ttc - paid, 0);
  const pay = invoiceStatus(paid, ttc);
  const editable = order.status === "DRAFT";
  const needsStock =
    order.lines.length > 0 && order.status !== "CANCELLED" && !stockOut;

  return (
    <div>
      <PageHeader
        eyebrow={order.reference}
        title={
          editable
            ? "Nouvelle facture"
            : order.customerName || order.reference
        }
        description={
          editable
            ? "Renseignez le client, les boissons et l'encaissement. La TVA de 18 % est calculée sur le montant HT."
            : `${order.customerContact}${order.customerAddress ? ` · ${order.customerAddress}` : ""}`
        }
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <Link href={pathFor(user.role, "/factures")} className={buttonClass("ghost")}>
                Retour
              </Link>
              <Badge
                tone={
                  order.status === "DELIVERED"
                    ? "success"
                    : order.status === "CANCELLED"
                      ? "danger"
                      : order.status === "DRAFT"
                        ? "neutral"
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
            <FactureActions
              orderId={order.id}
              printHref={pathFor(user.role, `/factures/${order.id}/imprimer`)}
              remaining={remaining}
              paid={paid}
              needsStock={needsStock}
            />
          </div>
        }
      />

      {editable ? (
        <Card>
          {products.length === 0 ? (
            <p className="text-sm text-stone-600">
              Ajoutez d&apos;abord une boisson active au catalogue.
            </p>
          ) : (
            <FactureForm
              orderId={order.id}
              products={products}
              defaultCustomerName={order.customerName}
              defaultCustomerContact={order.customerContact}
              defaultCustomerAddress={order.customerAddress}
              defaultNotes={order.notes}
              defaultLines={order.lines.map((line) => ({
                productId: line.productId,
                packagingId: line.packagingId,
                packs: line.quantityPacks,
              }))}
            />
          )}
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <FactureDocument
              reference={order.reference}
              customerName={order.customerName}
              customerContact={order.customerContact}
              customerAddress={order.customerAddress}
              notes={order.notes}
              createdAt={order.createdAt}
              lines={order.lines}
              pay={pay}
            />
          </div>

          <Card>
            <h2 className="display mb-4 text-xl text-brand">Paiement client</h2>
            {order.payments.length > 0 ? (
              <ul className="mb-4 space-y-1 text-sm text-stone-600">
                {order.payments.map((payment) => (
                  <li key={payment.id}>
                    {formatMoney(payment.amount)} · {paymentMethodLabels[payment.method]}{" "}
                    · {formatDate(payment.paidAt)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-stone-500">
                Aucun encaissement pour l&apos;instant.
              </p>
            )}
            {remaining > 0 && order.status !== "CANCELLED" ? (
              <CustomerPaymentForm orderId={order.id} remaining={remaining} taxed />
            ) : (
              <p className="text-sm font-semibold text-emerald-800">Soldée</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
