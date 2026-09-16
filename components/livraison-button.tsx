"use client";

import {
  useActionState,
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, GitCompare, Truck, X } from "lucide-react";
import { receivePurchaseAction } from "@/lib/actions/purchases";
import {
  Button,
  FieldError,
  FieldSuccess,
  Input,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { packagingLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { PackagingType } from "@/lib/types";

export type LivraisonProduct = {
  id: string;
  name: string;
  brand: string;
  packagings: { id: string; type: PackagingType; unitsPerPack: number }[];
};

export type LivraisonOrder = {
  id: string;
  reference: string;
  supplierName: string;
  lines: {
    id: string;
    productId: string;
    packagingId: string;
    quantityPacks: number;
    product: { name: string; brand: string };
    packaging: { type: PackagingType; unitsPerPack: number };
  }[];
};

type LineDraft = {
  id: string;
  productId: string;
  packagingId: string;
  packs: number;
  confirmed: boolean;
  editing: boolean;
};

export function LivraisonButton({
  order,
  products,
}: {
  order: LivraisonOrder;
  products: LivraisonProduct[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-2"
      >
        <Truck className="mr-1.5 h-4 w-4" />
        Livraison
      </button>
      {open ? (
        <LivraisonModal
          title={`Livraison ${order.reference}`}
          onClose={() => setOpen(false)}
        >
          <LivraisonBody
            order={order}
            products={products}
            onClose={() => setOpen(false)}
          />
        </LivraisonModal>
      ) : null}
    </>
  );
}

function LivraisonBody({
  order,
  products,
  onClose,
}: {
  order: LivraisonOrder;
  products: LivraisonProduct[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(receivePurchaseAction, undefined);
  const [localError, setLocalError] = useState<string | undefined>();
  const [rows, setRows] = useState<LineDraft[]>(() =>
    order.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      packagingId: line.packagingId,
      packs: line.quantityPacks,
      confirmed: false,
      editing: false,
    })),
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [onClose, state?.success]);

  function packagingsFor(productId: string) {
    return products.find((product) => product.id === productId)?.packagings ?? [];
  }

  function confirmLine(id: string) {
    const original = order.lines.find((line) => line.id === id);
    if (!original) return;
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              id,
              productId: original.productId,
              packagingId: original.packagingId,
              packs: original.quantityPacks,
              confirmed: true,
              editing: false,
            }
          : row,
      ),
    );
  }

  function editLine(id: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, editing: true } : row)),
    );
  }

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!rows.some((row) => row.confirmed || row.editing)) {
      event.preventDefault();
      setLocalError("Confirmez ou marquez comme différent au moins un article.");
      return;
    }
    setLocalError(undefined);
  }

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="orderId" value={order.id} />
      <p className="text-sm text-stone-600">
        Articles commandés chez{" "}
        <span className="font-semibold text-stone-800">{order.supplierName}</span>
      </p>
      <FieldError message={localError ?? state?.error} />
      <FieldSuccess message={state?.success} />
      {order.lines.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-stone-500">
          Aucun article sur cette commande.
        </p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Produit</Th>
              <Th>Conditionnement</Th>
              <Th>Qté</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const original = order.lines.find((line) => line.id === row.id);
              const catalog = products.find((product) => product.id === row.productId);
              const pack = packagingsFor(row.productId).find(
                (item) => item.id === row.packagingId,
              );
              const include = row.confirmed || row.editing;
              return (
                <tr key={row.id}>
                  <Td>
                    <input
                      type="hidden"
                      name={`recv_${row.id}`}
                      value={include ? row.packs : 0}
                    />
                    <input type="hidden" name={`product_${row.id}`} value={row.productId} />
                    <input
                      type="hidden"
                      name={`packaging_${row.id}`}
                      value={row.packagingId}
                    />
                    {row.editing ? (
                      <Select
                        className="h-10 min-w-[10rem]"
                        value={row.productId}
                        onChange={(event) => {
                          const productId = event.target.value;
                          const firstPack = packagingsFor(productId)[0]?.id ?? "";
                          updateLine(row.id, { productId, packagingId: firstPack });
                        }}
                      >
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.brand} {product.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="font-medium text-stone-900">
                        {catalog
                          ? `${catalog.brand} ${catalog.name}`
                          : `${original?.product.brand} ${original?.product.name}`}
                      </span>
                    )}
                  </Td>
                  <Td>
                    {row.editing ? (
                      <Select
                        className="h-10 min-w-[8rem]"
                        value={row.packagingId}
                        onChange={(event) =>
                          updateLine(row.id, { packagingId: event.target.value })
                        }
                      >
                        {packagingsFor(row.productId).map((item) => (
                          <option key={item.id} value={item.id}>
                            {packagingLabels[item.type]} · {item.unitsPerPack} u.
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="text-stone-600">
                        {pack
                          ? `${packagingLabels[pack.type]} · ${pack.unitsPerPack} u.`
                          : original
                            ? `${packagingLabels[original.packaging.type]} · ${original.packaging.unitsPerPack} u.`
                            : "—"}
                      </span>
                    )}
                  </Td>
                  <Td>
                    {row.editing ? (
                      <Input
                        className="h-10 w-20"
                        type="number"
                        min={1}
                        value={row.packs}
                        onChange={(event) =>
                          updateLine(row.id, {
                            packs: Math.max(1, Number(event.target.value) || 1),
                          })
                        }
                      />
                    ) : (
                      row.packs
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <IconAction
                        label="Confirmer"
                        disabled={row.confirmed}
                        active={row.confirmed}
                        onClick={() => confirmLine(row.id)}
                      >
                        <Check className="h-4 w-4" />
                      </IconAction>
                      <IconAction
                        label="Différent"
                        active={row.editing}
                        onClick={() => editLine(row.id)}
                      >
                        <GitCompare className="h-4 w-4" />
                      </IconAction>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Button disabled={pending || order.lines.length === 0}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

function IconAction({
  label,
  onClick,
  disabled = false,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition",
        disabled
          ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700 opacity-70"
          : active
            ? "border-copper bg-copper/10 text-copper"
            : "border-line bg-white text-brand hover:bg-background",
      )}
    >
      {children}
    </button>
  );
}

function LivraisonModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Fermer"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(20,53,44,0.55)] sm:max-h-[88vh] sm:max-w-3xl sm:rounded-3xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" />
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h3 id={titleId} className="display truncate pr-2 text-lg text-brand sm:text-xl">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-500 hover:bg-background hover:text-brand"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="safe-bottom overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
