"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FactureActions } from "@/components/facture-actions";
import { FactureDocument, type FactureDocumentLine } from "@/components/facture-document";
import { Badge, buttonClass } from "@/components/ui";
import { invoiceStatus, paymentStatusLabels, saleStatusLabels } from "@/lib/labels";
import { cn, invoiceTotals, paymentsTotal } from "@/lib/utils";
import type { CustomerOrderStatus } from "@/lib/types";

export type FactureTabItem = {
  id: string;
  reference: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  notes: string;
  createdAt: string;
  status: CustomerOrderStatus;
  printHref: string;
  editHref: string;
  lines: FactureDocumentLine[];
  payments: { amount: number }[];
  needsStock: boolean;
};

export function FactureTabs({
  factures,
  initialTab = 1,
}: {
  factures: FactureTabItem[];
  initialTab?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(() => {
    const index = Number.isFinite(initialTab) ? initialTab - 1 : 0;
    if (index < 0) return 0;
    if (index >= factures.length) return Math.max(factures.length - 1, 0);
    return index;
  });
  const current = factures[active];
  if (!current) return null;

  const { ttc } = invoiceTotals(current.lines);
  const paid = paymentsTotal(current.payments);
  const remaining = Math.max(ttc - paid, 0);
  const pay = invoiceStatus(paid, ttc);

  function selectTab(index: number) {
    setActive(index);
    router.replace(`${pathname}?tab=${index + 1}`, { scroll: false });
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Factures"
        className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {factures.map((facture, index) => {
          const selected = index === active;
          return (
            <button
              key={facture.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`facture-tab-${index + 1}`}
              aria-controls={`facture-panel-${index + 1}`}
              onClick={() => selectTab(index)}
              className={cn(
                "inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-semibold transition",
                selected
                  ? "bg-brand text-white shadow-inner"
                  : "border border-line bg-white text-brand hover:bg-background",
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`facture-panel-${active + 1}`}
        aria-labelledby={`facture-tab-${active + 1}`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="display text-lg text-brand">
              Facture {active + 1}
              <span className="ml-2 text-sm font-sans font-medium text-stone-500">
                {current.reference}
              </span>
            </p>
            <Badge
              tone={
                current.status === "DELIVERED"
                  ? "success"
                  : current.status === "CANCELLED"
                    ? "danger"
                    : current.status === "DRAFT"
                      ? "neutral"
                      : "warning"
              }
            >
              {saleStatusLabels[current.status]}
            </Badge>
            <Badge
              tone={pay === "PAID" ? "success" : pay === "PARTIAL" ? "warning" : "danger"}
            >
              {paymentStatusLabels[pay]}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={current.editHref}
              className={buttonClass("ghost", "h-9 min-h-9 px-3 text-xs")}
            >
              {current.status === "DRAFT" ? "Compléter" : "Ouvrir"}
            </Link>
            <FactureActions
              orderId={current.id}
              printHref={current.printHref}
              remaining={remaining}
              paid={paid}
              needsStock={current.needsStock}
            />
          </div>
        </div>
        <FactureDocument
          reference={current.reference}
          customerName={current.customerName}
          customerContact={current.customerContact}
          customerAddress={current.customerAddress}
          notes={current.notes}
          createdAt={current.createdAt}
          lines={current.lines}
          pay={pay}
        />
      </div>
    </div>
  );
}
