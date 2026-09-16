"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { saveFactureAction, startFactureAction } from "@/lib/actions/sales";
import {
  Button,
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { packagingLabels, paymentMethodLabels } from "@/lib/labels";
import {
  invoiceTotals,
  lineAmount,
  formatMoney,
  TVA_RATE,
} from "@/lib/utils";
import type { PackagingType } from "@/lib/types";

export type FactureProduct = {
  id: string;
  name: string;
  brand: string;
  volume: string;
  unitSalePrice: number;
  packagings: { id: string; type: PackagingType; unitsPerPack: number }[];
};

type DraftLine = {
  productId: string;
  packagingId: string;
  packs: number;
};

function emptyLine(products: FactureProduct[]): DraftLine {
  return {
    productId: products[0]?.id ?? "",
    packagingId: products[0]?.packagings[0]?.id ?? "",
    packs: 1,
  };
}

function SubmitFacture() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer la facture"}
    </Button>
  );
}

export function CreateFactureButton() {
  return (
    <form action={startFactureAction}>
      <CreateFactureSubmit />
    </form>
  );
}

function CreateFactureSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending}>
      <Plus className="mr-2 h-4 w-4" />
      {pending ? "Création…" : "Créer une facture"}
    </Button>
  );
}

export function FactureForm({
  orderId,
  products,
  defaultCustomerName = "",
  defaultCustomerContact = "",
  defaultCustomerAddress = "",
  defaultNotes = "",
  defaultLines,
}: {
  orderId: string;
  products: FactureProduct[];
  defaultCustomerName?: string;
  defaultCustomerContact?: string;
  defaultCustomerAddress?: string;
  defaultNotes?: string;
  defaultLines?: DraftLine[];
}) {
  const [state, action] = useActionState(saveFactureAction, undefined);
  const [lines, setLines] = useState<DraftLine[]>(
    defaultLines?.length ? defaultLines : [emptyLine(products)],
  );

  function packagingsFor(productId: string) {
    return products.find((product) => product.id === productId)?.packagings ?? [];
  }

  function productFor(productId: string) {
    return products.find((product) => product.id === productId);
  }

  const priced = lines.map((line) => {
    const product = productFor(line.productId);
    const pack = packagingsFor(line.productId).find(
      (item) => item.id === line.packagingId,
    );
    const unitPrice = product?.unitSalePrice ?? 0;
    const unitsPerPack = pack?.unitsPerPack ?? 0;
    return {
      quantityPacks: line.packs,
      unitPrice,
      packaging: { unitsPerPack },
      ht: lineAmount(line.packs, unitsPerPack, unitPrice),
    };
  });
  const totals = invoiceTotals(priced);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <FieldError message={state?.error} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="customerName">Nom du client</Label>
          <Input
            id="customerName"
            name="customerName"
            required
            defaultValue={defaultCustomerName}
            placeholder="Nom ou enseigne"
          />
        </div>
        <div>
          <Label htmlFor="customerContact">Contact</Label>
          <Input
            id="customerContact"
            name="customerContact"
            required
            defaultValue={defaultCustomerContact}
            placeholder="Téléphone"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="customerAddress">Adresse / quartier</Label>
        <Input
          id="customerAddress"
          name="customerAddress"
          defaultValue={defaultCustomerAddress}
        />
      </div>

      <div>
        <Label>Boissons et quantités</Label>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-line px-2 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Produit
                </th>
                <th className="border-b border-line px-2 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Colis
                </th>
                <th className="border-b border-line px-2 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Qté
                </th>
                <th className="border-b border-line px-2 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  P.U. HT
                </th>
                <th className="border-b border-line px-2 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Montant HT
                </th>
                <th className="border-b border-line px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const product = productFor(line.productId);
                const packs = packagingsFor(line.productId);
                return (
                  <tr key={`${line.productId}-${index}`}>
                    <td className="border-b border-line px-2 py-2">
                      <Select
                        value={line.productId}
                        onChange={(event) => {
                          const productId = event.target.value;
                          const firstPack = packagingsFor(productId)[0]?.id ?? "";
                          setLines((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, productId, packagingId: firstPack }
                                : item,
                            ),
                          );
                        }}
                      >
                        {products.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.brand} {item.name} · {item.volume}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="border-b border-line px-2 py-2">
                      <Select
                        value={line.packagingId}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, packagingId: event.target.value }
                                : item,
                            ),
                          )
                        }
                      >
                        {packs.map((pack) => (
                          <option key={pack.id} value={pack.id}>
                            {packagingLabels[pack.type]} · {pack.unitsPerPack} u.
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="border-b border-line px-2 py-2">
                      <Input
                        className="w-24"
                        type="number"
                        min={1}
                        value={line.packs}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    packs: Math.max(1, Number(event.target.value) || 1),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="border-b border-line px-2 py-2 text-stone-600">
                      {formatMoney(product?.unitSalePrice ?? 0)}
                    </td>
                    <td className="border-b border-line px-2 py-2 font-medium">
                      {formatMoney(priced[index]?.ht ?? 0)}
                    </td>
                    <td className="border-b border-line px-2 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setLines((current) => current.filter((_, i) => i !== index))
                        }
                        disabled={lines.length === 1}
                      >
                        Retirer
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-3"
          onClick={() => setLines((current) => [...current, emptyLine(products)])}
        >
          Ajouter une ligne
        </Button>
      </div>

      <div className="ml-auto w-full max-w-sm space-y-2 rounded-2xl border border-line bg-background/70 px-4 py-3 text-sm">
        <div className="flex justify-between text-stone-600">
          <span>Sous-total HT</span>
          <span>{formatMoney(totals.ht)}</span>
        </div>
        <div className="flex justify-between text-stone-600">
          <span>TVA {Math.round(TVA_RATE * 100)} %</span>
          <span>{formatMoney(totals.tva)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold text-brand">
          <span>Total TTC</span>
          <span>{formatMoney(totals.ttc)}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="paymentAmount">Encaissement (F)</Label>
          <Input
            id="paymentAmount"
            name="paymentAmount"
            type="number"
            min={0}
            max={totals.ttc}
            defaultValue={0}
            placeholder={`0 à ${totals.ttc}`}
          />
          <p className="mt-1 text-xs text-stone-500">
            0 si la facture reste à crédit. Maximum {formatMoney(totals.ttc)}.
          </p>
        </div>
        <div>
          <Label htmlFor="paymentMethod">Mode de paiement</Label>
          <Select id="paymentMethod" name="paymentMethod" defaultValue="CASH">
            {Object.entries(paymentMethodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultNotes} />
      </div>

      <SubmitFacture />
    </form>
  );
}
