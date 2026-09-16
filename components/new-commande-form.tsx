"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { PurchaseForm } from "@/components/forms";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PackagingType } from "@/lib/types";

type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  packagings: { id: string; type: PackagingType; unitsPerPack: number }[];
};

export function NewCommandeButton({
  suppliers,
  products,
  label = "Nouvelle Commande",
  title = "Nouvelle commande",
  returnTo = "commandes",
  submitLabel,
}: {
  suppliers: { id: string; name: string }[];
  products: CatalogProduct[];
  label?: string;
  title?: string;
  returnTo?: "commandes" | "achats" | "approvisionnements";
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>
      {open ? (
        <CommandeModal title={title} onClose={() => setOpen(false)}>
          {suppliers.length === 0 || products.length === 0 ? (
            <p className="text-sm text-stone-600">
              Ajoutez d&apos;abord un fournisseur et au moins une boisson.
            </p>
          ) : (
            <PurchaseForm
              suppliers={suppliers}
              products={products}
              returnTo={returnTo}
              submitLabel={submitLabel}
            />
          )}
        </CommandeModal>
      ) : null}
    </>
  );
}

function CommandeModal({
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
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(20,53,44,0.55)] sm:max-h-[88vh] sm:max-w-2xl sm:rounded-3xl",
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" />
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h3 id={titleId} className="display text-lg text-brand sm:text-xl">
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
