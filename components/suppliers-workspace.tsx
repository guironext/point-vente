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
import {
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { SupplierForm } from "@/components/forms";
import { deleteSupplierAction } from "@/lib/actions/catalog";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FieldError,
  Input,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export type SupplierCard = {
  id: string;
  name: string;
  contact: string;
  address: string;
  notes: string;
  active: boolean;
  orders: number;
  invoices: number;
};

export function SuppliersWorkspace({ suppliers }: { suppliers: SupplierCard[] }) {
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.contact, supplier.address, supplier.notes]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, suppliers]);

  const emptyCatalog = suppliers.length === 0;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(17.5rem,22rem)_minmax(0,1fr)] lg:gap-6">
      <div className="lg:sticky lg:top-20 lg:self-start">
        {emptyCatalog ? (
          <Card>
            <FormIntro />
            <SupplierForm />
          </Card>
        ) : (
          <>
            <div className="lg:hidden">
              <Button type="button" className="w-full" onClick={() => setSheetOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau fournisseur
              </Button>
            </div>
            <Card className="hidden lg:block">
              <FormIntro />
              <SupplierForm />
            </Card>
            {sheetOpen ? (
              <SupplierSheet
                title="Nouveau fournisseur"
                onClose={() => setSheetOpen(false)}
              >
                <SupplierForm onSuccess={() => setSheetOpen(false)} />
              </SupplierSheet>
            ) : null}
          </>
        )}
      </div>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Truck className="h-4 w-4" />
              </span>
              <h2 className="display text-lg text-brand sm:text-xl">Carnet</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-stone-500 sm:text-sm">
              Contactez, localisez et suivez l&apos;activité de chaque fournisseur.
            </p>
          </div>
          <Badge>{filtered.length}</Badge>
        </div>

        {emptyCatalog ? (
          <EmptyState
            title="Aucun fournisseur"
            description="Enregistrez un premier contact pour passer commande."
          />
        ) : (
          <>
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un nom, un contact, une ville…"
                aria-label="Rechercher un fournisseur"
                className="pl-10"
              />
            </div>
            {filtered.length === 0 ? (
              <EmptyState
                title="Aucun résultat"
                description="Modifiez la recherche ou ajoutez un nouveau fournisseur."
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {filtered.map((supplier) => (
                  <li key={supplier.id}>
                    <SupplierTile supplier={supplier} />
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
        <h2 className="display text-lg text-brand sm:text-xl">Nouveau fournisseur</h2>
      </div>
      <p className="mt-1 text-xs leading-5 text-stone-500 sm:text-sm">
        Nom et contact suffisent. L&apos;adresse et les notes aident le gérant au quotidien.
      </p>
    </div>
  );
}

function SupplierTile({ supplier }: { supplier: SupplierCard }) {
  const href = contactHref(supplier.contact);
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const close = useCallback(() => setMode(null), []);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-white/70 p-3.5 sm:p-4",
        !supplier.active && "opacity-75",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          supplier.active ? "bg-brand" : "bg-stone-300",
        )}
      />
      <div className="flex items-start gap-3 pl-2">
        <span
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            avatarTone(supplier.id),
          )}
        >
          {initials(supplier.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-copper">{supplier.name}</h3>
            <Badge tone={supplier.active ? "success" : "neutral"}>
              {supplier.active ? "Actif" : "Inactif"}
            </Badge>
          </div>
          {href ? (
            <a
              href={href}
              className="mt-1 inline-flex min-h-11 max-w-full items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              {href.startsWith("mailto:") ? (
                <Mail className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Phone className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{supplier.contact}</span>
            </a>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{supplier.contact}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <IconButton
            label={`Modifier ${supplier.name}`}
            onClick={() => setMode("edit")}
          >
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={`Supprimer ${supplier.name}`}
            onClick={() => setMode("delete")}
            danger
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      {mode === "edit" ? (
        <SupplierSheet title={`Modifier ${supplier.name}`} onClose={close}>
          <SupplierForm supplier={supplier} onSuccess={close} />
        </SupplierSheet>
      ) : null}
      {mode === "delete" ? (
        <SupplierSheet title="Supprimer le fournisseur" onClose={close}>
          <DeleteSupplierForm supplier={supplier} onCancel={close} />
        </SupplierSheet>
      ) : null}

      <dl className="mt-3 space-y-2 pl-2 text-sm text-stone-600">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
          <span className="min-w-0 break-words">
            {supplier.address.trim() || "Adresse non renseignée"}
          </span>
        </div>
        {supplier.notes.trim() ? (
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
            <span className="min-w-0 line-clamp-2">{supplier.notes}</span>
          </div>
        ) : null}
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-2 pl-2">
        <Metric
          icon={<Truck className="h-3.5 w-3.5" />}
          label={supplier.orders > 1 ? "commandes" : "commande"}
          value={supplier.orders}
        />
        <Metric
          icon={<Receipt className="h-3.5 w-3.5" />}
          label={supplier.invoices > 1 ? "factures" : "facture"}
          value={supplier.invoices}
        />
      </div>
    </article>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <p className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-background px-2 text-xs font-semibold text-brand">
      {icon}
      <span>
        {value} {label}
      </span>
    </p>
  );
}

function DeleteSupplierForm({
  supplier,
  onCancel,
}: {
  supplier: SupplierCard;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(deleteSupplierAction, undefined);
  const hasHistory = supplier.orders > 0 || supplier.invoices > 0;

  useEffect(() => {
    if (state?.success) onCancel();
  }, [state?.success, onCancel]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={supplier.id} />
      <FieldError message={state?.error} />
      <p className="text-sm leading-6 text-stone-600">
        Supprimer <span className="font-semibold text-stone-900">{supplier.name}</span>{" "}
        du carnet ? Cette action est définitive.
      </p>
      {hasHistory ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {supplier.orders > 0
            ? `${supplier.orders} commande${supplier.orders > 1 ? "s" : ""}`
            : null}
          {supplier.orders > 0 && supplier.invoices > 0 ? " et " : null}
          {supplier.invoices > 0
            ? `${supplier.invoices} facture${supplier.invoices > 1 ? "s" : ""}`
            : null}{" "}
          y sont liées. La suppression est bloquée. Vous pouvez le marquer inactif via
          l&apos;édition.
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

function SupplierSheet({
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

function contactHref(contact: string) {
  const value = contact.trim();
  if (!value) return null;
  if (value.includes("@")) return `mailto:${value}`;
  const compact = value.replace(/[^\d+]/g, "");
  const digits = compact.replace(/\D/g, "");
  if (digits.length >= 8) return `tel:${compact}`;
  return null;
}
