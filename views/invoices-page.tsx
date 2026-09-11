import { InvoiceForm, PaymentReceiptForm } from "@/components/forms";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invoiceStatus, paymentMethodLabels, paymentStatusLabels } from "@/lib/labels";
import { formatDay, formatMoney, paymentsTotal } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

type SupplierOption = { id: string; name: string };
type OrderOption = { id: string; reference: string };
type InvoiceRow = {
  id: string;
  number: string;
  amount: number;
  issuedAt: Date;
  supplier: { name: string };
  purchaseOrder: { reference: string } | null;
  payments: {
    id: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
  }[];
};

export default async function InvoicesPage() {
  await requireRoles(["ADMIN", "GERANT"]);
  const [suppliers, orders, invoices] = (await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.purchaseOrder.findMany({ orderBy: { orderedAt: "desc" }, take: 50 }),
    prisma.supplierInvoice.findMany({
      include: { supplier: true, purchaseOrder: true, payments: true },
      orderBy: { issuedAt: "desc" },
    }),
  ])) as [SupplierOption[], OrderOption[], InvoiceRow[]];

  return (
    <div>
      <PageHeader
        eyebrow="Comptabilité fournisseur"
        title="Factures et reçus"
        description="Enregistrez les factures fournisseurs puis les reçus de paiement, y compris partiels."
      />
      <Card className="mb-6">
        <h2 className="display mb-4 text-xl text-brand">Nouvelle facture</h2>
        <InvoiceForm
          suppliers={suppliers}
          orders={orders.map((order) => ({ id: order.id, reference: order.reference }))}
        />
      </Card>
      <div className="space-y-4">
        {invoices.map((invoice) => {
          const paid = paymentsTotal(invoice.payments);
          const remaining = invoice.amount - paid;
          const status = invoiceStatus(paid, invoice.amount);
          return (
            <Card key={invoice.id}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand">
                    {invoice.number} · {invoice.supplier.name}
                  </p>
                  <p className="text-sm text-stone-500">
                    {formatDay(invoice.issuedAt)}
                    {invoice.purchaseOrder
                      ? ` · ${invoice.purchaseOrder.reference}`
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(invoice.amount)}</p>
                  <Badge
                    tone={
                      status === "PAID"
                        ? "success"
                        : status === "PARTIAL"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {paymentStatusLabels[status]} · reste {formatMoney(remaining)}
                  </Badge>
                </div>
              </div>
              {invoice.payments.length > 0 ? (
                <ul className="mb-3 text-sm text-stone-600">
                  {invoice.payments.map((payment) => (
                    <li key={payment.id}>
                      Reçu {formatMoney(payment.amount)} ·{" "}
                      {paymentMethodLabels[payment.method]} · {formatDay(payment.paidAt)}
                    </li>
                  ))}
                </ul>
              ) : null}
              {remaining > 0 ? (
                <PaymentReceiptForm invoiceId={invoice.id} remaining={remaining} />
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
