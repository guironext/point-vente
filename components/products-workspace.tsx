"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Beer, Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { ProductForm } from "@/components/forms";
import { deleteProductAction } from "@/lib/actions/catalog";
import { Badge, Button, Card, EmptyState, FieldError, Input } from "@/components/ui";
import { packagingLabels } from "@/lib/labels";
import { cn, formatMoney } from "@/lib/utils";
import type { PackagingType } from "@/lib/types";

export type ProductCard = {
  id: string;
  name: string;
  brand: string;
  volume: string;
  unitPurchasePrice: number;
  unitSalePrice: number;
  lowStockThreshold: number;
  active: boolean;
  remaining: number;
  supplierId: string | null;
  supplierName: string | null;
  packagings: { type: PackagingType; unitsPerPack: number }[];
  linkedCount: number;
};

export function ProductsWorkspace({
  products,
  suppliers,
}: {
  products: ProductCard[];
  suppliers: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "inactive">("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (filter === "low" && product.remaining > product.lowStockThreshold) return false;
      if (filter === "inactive" && product.active) return false;
      if (!q) return true;
      return [product.brand, product.name, product.volume, product.supplierName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [filter, products, query]);

  const emptyCatalog = products.length === 0;
  const lowCount = products.filter(
    (product) => product.remaining <= product.lowStockThreshold,
  ).length;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(17.5rem,22rem)_minmax(0,1fr)] lg:gap-6">
      <div className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
        {emptyCatalog ? (
          <Card>
            <FormIntro />
            <ProductForm suppliers={suppliers} />
          </Card>
        ) : (
          <>
            <div className="lg:hidden">
              <Button type="button" className="w-full" onClick={() => setSheetOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle boisson
              </Button>
            </div>
            <Card className="hidden lg:block">
              <FormIntro />
              <ProductForm suppliers={suppliers} />
            </Card>
            {sheetOpen ? (
              <ProductSheet title="Nouvelle boisson" onClose={() => setSheetOpen(false)}>
                <ProductForm suppliers={suppliers} onSuccess={() => setSheetOpen(false)} />
              </ProductSheet>
            ) : null}
          </>
        )}
      </div>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Beer className="h-4 w-4" />
              </span>
              <h2 className="display text-lg text-brand sm:text-xl">Catalogue</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-stone-500 sm:text-sm">
              Prix, conditionnements et stock de chaque boisson, avec le fournisseur en orange.
            </p>
          </div>
          <Badge>{filtered.length}</Badge>
        </div>

        {emptyCatalog ? (
          <EmptyState
            title="Aucune boisson"
            description="Ajoutez une première boisson pour constituer le catalogue."
          />
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une marque, un nom, un fournisseur…"
                aria-label="Rechercher une boisson"
                className="pl-10"
              />
            </div>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="Toutes"
              />
              <FilterChip
                active={filter === "low"}
                onClick={() => setFilter("low")}
                label="Stock bas"
                count={lowCount}
              />
              <FilterChip
                active={filter === "inactive"}
                onClick={() => setFilter("inactive")}
                label="Inactives"
              />
            </div>
            {filtered.length === 0 ? (
              <EmptyState
                title="Aucun résultat"
                description="Modifiez la recherche ou le filtre, ou ajoutez une nouvelle boisson."
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {filtered.map((product) => (
                  <li key={product.id}>
                    <ProductTile product={product} suppliers={suppliers} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function FormIntro() {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-copper/15 text-copper">
          <Plus className="h-4 w-4" />
        </span>
        <h2 className="display text-lg text-brand sm:text-xl">Nouvelle boisson</h2>
      </div>
      <p className="mt-1 text-xs leading-5 text-stone-500 sm:text-sm">
        Une unité, un prix, un fournisseur. Casier et carton restent des conditionnements.
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition sm:h-9 sm:min-h-9",
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-white text-stone-600 hover:bg-background",
      )}
    >
      {label}
      {typeof count === "number" ? (
        <span className={cn("text-xs", active ? "text-white/80" : "text-stone-400")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function ProductTile({
  product,
  suppliers,
}: {
  product: ProductCard;
  suppliers: { id: string; name: string }[];
}) {
  const low = product.remaining <= product.lowStockThreshold;
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const close = useCallback(() => setMode(null), []);
  const casierUnits =
    product.packagings.find((pack) => pack.type === "CASIER")?.unitsPerPack ?? 0;
  const cartonUnits =
    product.packagings.find((pack) => pack.type === "CARTON")?.unitsPerPack ?? 0;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-white/70 p-3.5 sm:p-4",
        !product.active && "opacity-75",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          low ? "bg-copper" : product.active ? "bg-brand" : "bg-stone-300",
        )}
      />
      <div className="flex items-start gap-3 pl-2">
        <span
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            avatarTone(product.id),
          )}
        >
          {initials(`${product.brand} ${product.name}`)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-brand">
              {product.brand} {product.name}
            </h3>
            <Badge tone={product.active ? "success" : "neutral"}>
              {product.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {product.supplierName ? (
            <p className="mt-1 truncate text-xs font-semibold text-copper">{product.supplierName}</p>
          ) : (
            <p className="mt-1 truncate text-xs text-stone-400">Sans fournisseur</p>
          )}
          <p className="mt-0.5 text-xs text-stone-500">{product.volume}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <IconButton
            label={`Modifier ${product.brand} ${product.name}`}
            onClick={() => setMode("edit")}
          >
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={`Supprimer ${product.brand} ${product.name}`}
            onClick={() => setMode("delete")}
            danger
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      {mode === "edit" ? (
        <ProductSheet title={`Modifier ${product.brand} ${product.name}`} onClose={close}>
          <ProductForm
            suppliers={suppliers}
            product={{
              id: product.id,
              name: product.name,
              brand: product.brand,
              volume: product.volume,
              unitPurchasePrice: product.unitPurchasePrice,
              unitSalePrice: product.unitSalePrice,
              lowStockThreshold: product.lowStockThreshold,
              active: product.active,
              supplierId: product.supplierId,
              casierUnits,
              cartonUnits,
            }}
            onSuccess={close}
          />
        </ProductSheet>
      ) : null}
      {mode === "delete" ? (
        <ProductSheet title="Supprimer la boisson" onClose={close}>
          <DeleteProductForm product={product} onCancel={close} />
        </ProductSheet>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5 pl-2">
        {product.packagings.length === 0 ? (
          <span className="rounded-full bg-background px-2.5 py-1 text-xs text-stone-500">
            Aucun conditionnement
          </span>
        ) : (
          product.packagings.map((pack) => (
            <span
              key={pack.type}
              className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-medium text-stone-600"
            >
              <Package className="h-3 w-3 text-stone-400" />
              {packagingLabels[pack.type]} × {pack.unitsPerPack}
            </span>
          ))
        )}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 pl-2">
        <MiniStat label="Achat" value={formatMoney(product.unitPurchasePrice)} />
        <MiniStat label="Vente" value={formatMoney(product.unitSalePrice)} />
        <MiniStat label="Stock" value={`${product.remaining} u.`} alert={low} />
      </dl>
    </article>
  );
}

function MiniStat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl bg-background px-2 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-xs font-semibold sm:text-sm",
          alert ? "text-copper" : "text-brand",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DeleteProductForm({
  product,
  onCancel,
}: {
  product: ProductCard;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(deleteProductAction, undefined);
  const hasHistory = product.linkedCount > 0;

  useEffect(() => {
    if (state?.success) onCancel();
  }, [state?.success, onCancel]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={product.id} />
      <FieldError message={state?.error} />
      <p className="text-sm leading-6 text-stone-600">
        Supprimer{" "}
        <span className="font-semibold text-stone-900">
          {product.brand} {product.name}
        </span>{" "}
        du catalogue ? Cette action est définitive.
      </p>
      {hasHistory ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Des commandes, ventes ou mouvements de stock y sont liés. La suppression est
          bloquée. Vous pouvez la marquer inactive via l&apos;édition.
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 min-h-11 w-full items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-brand transition hover:bg-background sm:w-auto"
        >
          Annuler
        </button>
        <Button variant="danger" disabled={pending || hasHistory}>
          {pending ? "Suppression…" : "Supprimer"}
        </Button>
      </div>
    </form>
  );
}

function IconButton({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 min-h-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white transition sm:h-9 sm:w-9 sm:min-h-9",
        danger
          ? "text-red-700 hover:bg-red-50"
          : "text-brand hover:bg-background",
      )}
    >
      {children}
    </button>
  );
}

function ProductSheet({
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
        className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(20,53,44,0.55)] sm:max-h-[88vh] sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" />
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h3 id={titleId} className="display truncate pr-2 text-lg text-brand">
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
        <div className="safe-bottom overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

function avatarTone(id: string) {
  const tones = [
    "bg-brand text-white",
    "bg-brand-2 text-white",
    "bg-copper text-white",
  ];
  let hash = 0;
  for (const char of id) hash += char.charCodeAt(0);
  return tones[hash % tones.length];
}
