import { notFound } from "next/navigation";
import Link from "next/link";
import { FactureDocument } from "@/components/facture-document";
import { PrintTrigger } from "@/components/print-trigger";
import { buttonClass } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invoiceStatus } from "@/lib/labels";
import { pathFor } from "@/lib/session";
import { invoiceTotals, paymentsTotal } from "@/lib/utils";
import type { PackagingType, PaymentMethod } from "@/lib/types";

type PrintFacture = {
  id: string;
  reference: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  notes: string;
  createdAt: Date;
  lines: {
    id: string;
    quantityPacks: number;
    unitPrice: number;
    product: { brand: string; name: string; volume: string };
    packaging: { type: PackagingType; unitsPerPack: number };
  }[];
  payments: { amount: number; method: PaymentMethod }[];
};

export default async function FacturePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRoles(["ADMIN", "GERANT", "VENDEUR"]);
  const { id } = await params;
  const found = await prisma.customerOrder.findUnique({
    where: { id },
    include: {
      lines: { include: { product: true, packaging: true } },
      payments: true,
    },
  });
  if (!found) notFound();
  const order = found as PrintFacture;
  const { ttc } = invoiceTotals(order.lines);
  const paid = paymentsTotal(order.payments);
  const pay = invoiceStatus(paid, ttc);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={pathFor(user.role, `/factures/${order.id}`)}
          className={buttonClass("ghost", "h-9 min-h-9 px-3 text-xs")}
        >
          Retour
        </Link>
        <PrintTrigger />
      </div>
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
  );
}
