import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { saleStatusLabels } from "@/lib/labels";
import type { DashboardSale, LowStockItem } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export function DashboardHero({
  eyebrow,
  title,
  greeting,
  children,
  tone = "brand",
}: {
  eyebrow: string;
  title: string;
  greeting: string;
  children?: React.ReactNode;
  tone?: "brand" | "depot" | "seller";
}) {
  return (
    <section
      className={cn(
        "relative mb-6 overflow-hidden rounded-3xl px-5 py-6 text-white sm:mb-8 sm:px-7 sm:py-8",
        tone === "seller" ? "bg-[#3d2416]" : tone === "depot" ? "bg-[#1a4338]" : "bg-brand",
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-copper/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f3c4a8]">
        {eyebrow}
      </p>
      <h1 className="display mt-2 text-2xl leading-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{greeting}</p>
      {children ? (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">{children}</div>
      ) : null}
    </section>
  );
}

export function ShortcutGrid({
  items,
}: {
  items: { href: string; label: string; hint: string }[];
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-2xl border border-line bg-paper px-4 py-4 shadow-[0_12px_40px_-28px_rgba(20,53,44,0.5)] transition hover:border-brand/30"
        >
          <p className="font-semibold text-brand">{item.label}</p>
          <p className="mt-1 text-xs text-stone-500">{item.hint}</p>
        </Link>
      ))}
    </div>
  );
}

export function OpenSalesList({
  orders,
  hrefFor,
  empty,
}: {
  orders: DashboardSale[];
  hrefFor: (id: string) => string;
  empty: string;
}) {
  if (orders.length === 0) {
    return <EmptyState title="Rien en cours" description={empty} />;
  }
  return (
    <ul className="divide-y divide-line">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={hrefFor(order.id)}
            className="-mx-1 flex min-h-14 items-center justify-between gap-3 rounded-xl px-1 py-3 hover:bg-background"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-brand">{order.reference}</p>
              <p className="truncate text-sm text-stone-500">{order.customerName}</p>
            </div>
            <Badge tone={order.status === "OUT_FOR_DELIVERY" ? "warning" : "info"}>
              {saleStatusLabels[order.status]}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LowStockList({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState title="Niveaux OK" description="Aucune boisson sous le seuil." />
    );
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((product) => (
        <li
          key={product.id}
          className="flex min-h-14 items-center justify-between gap-3 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand">
              {product.brand} {product.name}
            </p>
            <p className="text-xs text-stone-500">Seuil {product.lowStockThreshold} u.</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-copper">
            {product.remaining} u.
          </span>
        </li>
      ))}
    </ul>
  );
}
