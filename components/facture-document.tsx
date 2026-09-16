import { Badge, Table, Td, Th } from "@/components/ui";
import { packagingLabels, paymentStatusLabels } from "@/lib/labels";
import {
  formatDate,
  formatMoney,
  invoiceTotals,
  lineAmount,
  TVA_RATE,
} from "@/lib/utils";
import { Mark } from "@/components/mark";
import type { PackagingType, PaymentStatus } from "@/lib/types";

export type FactureDocumentLine = {
  id: string;
  quantityPacks: number;
  unitPrice: number;
  product: { brand: string; name: string; volume: string };
  packaging: { type: PackagingType; unitsPerPack: number };
};

export function FactureDocument({
  reference,
  customerName,
  customerContact,
  customerAddress,
  notes,
  createdAt,
  lines,
  pay,
}: {
  reference: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  notes: string;
  createdAt: Date | string;
  lines: FactureDocumentLine[];
  pay: PaymentStatus;
}) {
  const { ht, tva, ttc } = invoiceTotals(lines);

  return (
    <article className="rounded-2xl border border-line bg-paper p-5 sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mark className="h-12 w-12" />
          <div>
            <p className="display text-2xl text-brand">Afrik-Event</p>
            <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
              Facture client
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="display text-xl text-brand">{reference}</p>
          <p className="text-sm text-stone-500">Émise le {formatDate(createdAt)}</p>
          <div className="mt-2 flex justify-end">
            <Badge
              tone={pay === "PAID" ? "success" : pay === "PARTIAL" ? "warning" : "danger"}
            >
              {paymentStatusLabels[pay]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-copper">
          Facturé à
        </p>
        <p className="mt-1 font-semibold text-brand">{customerName || "—"}</p>
        {customerContact ? (
          <p className="text-sm text-stone-600">{customerContact}</p>
        ) : null}
        {customerAddress ? (
          <p className="text-sm text-stone-600">{customerAddress}</p>
        ) : null}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Boisson</Th>
            <Th>Colis</Th>
            <Th>Unités</Th>
            <Th>P.U. HT</Th>
            <Th>Montant HT</Th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <Td className="text-stone-500">Aucune ligne</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
            </tr>
          ) : (
            lines.map((line) => {
              const units = line.quantityPacks * line.packaging.unitsPerPack;
              return (
                <tr key={line.id}>
                  <Td>
                    {line.product.brand} {line.product.name}
                    <span className="block text-xs text-stone-500">
                      {line.product.volume}
                    </span>
                  </Td>
                  <Td>
                    {line.quantityPacks}{" "}
                    {packagingLabels[line.packaging.type].toLowerCase()}
                    {line.quantityPacks > 1 ? "s" : ""}
                  </Td>
                  <Td>{units}</Td>
                  <Td>{formatMoney(line.unitPrice)}</Td>
                  <Td>
                    {formatMoney(
                      lineAmount(
                        line.quantityPacks,
                        line.packaging.unitsPerPack,
                        line.unitPrice,
                      ),
                    )}
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      <div className="ml-auto mt-4 w-full max-w-sm space-y-2 text-sm">
        <div className="flex justify-between text-stone-600">
          <span>Sous-total HT</span>
          <span>{formatMoney(ht)}</span>
        </div>
        <div className="flex justify-between text-stone-600">
          <span>TVA {Math.round(TVA_RATE * 100)} %</span>
          <span>{formatMoney(tva)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold text-brand">
          <span>Total TTC</span>
          <span>{formatMoney(ttc)}</span>
        </div>
      </div>
      {notes ? <p className="mt-4 text-sm text-stone-500">{notes}</p> : null}
    </article>
  );
}
