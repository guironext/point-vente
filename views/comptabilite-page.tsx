import Link from "next/link";
import { CashOutflowForm } from "@/components/cash-outflow-form";
import {
  Badge,
  Card,
  EmptyState,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireActiveUser } from "@/lib/auth";
import {
  getAccountingSnapshot,
  parseAccountingPeriod,
  type AccountingPeriod,
} from "@/lib/accounting";
import {
  cashOutflowReasonLabels,
  invoiceStatus,
  paymentMethodLabels,
  paymentStatusLabels,
  saleStatusLabels,
} from "@/lib/labels";
import { pathFor } from "@/lib/session";
import { cn, formatDate, formatDay, formatFcfa, formatMoney } from "@/lib/utils";
import type { CashOutflowReason, PaymentMethod } from "@/lib/types";

const PERIODS: { id: AccountingPeriod; label: string }[] = [
  { id: "jour", label: "Aujourd'hui" },
  { id: "semaine", label: "Cette semaine" },
  { id: "tout", label: "Tout" },
];

function periodCaption(period: AccountingPeriod) {
  if (period === "jour") return "Journée en cours";
  if (period === "semaine") return "Depuis lundi";
  return "Depuis le début";
}

function methodShare(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export default async function ComptabilitePage({
  searchParams,
}: {
  searchParams?: Promise<{ periode?: string }>;
}) {
  const user = await requireActiveUser();
  const scopedToSeller = user.role === "VENDEUR";
  const params = searchParams ? await searchParams : {};
  const period = parseAccountingPeriod(params.periode);
  const pageHref = pathFor(user.role, "/comptabilite");
  const salesHref = pathFor(user.role, "/ventes");
  const data = await getAccountingSnapshot({
    createdById: scopedToSeller ? user.id : undefined,
    salesHref: (id) => `${salesHref}/${id}`,
    period,
  });

  const cashNegative = data.cashRemain < 0;
  const methodTotal = data.collected;
  const showSellers = !scopedToSeller && data.sellers.length > 0;

  return (
    <div className="pb-8">
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-[#3d2416] px-5 py-6 text-white sm:mb-8 sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-copper/35 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f3c4a8]">
              {scopedToSeller ? "Caisse vendeur" : "Caisse globale"}
            </p>
            <h1 className="display mt-2 text-2xl leading-tight sm:text-3xl">
              Comptabilité
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              {periodCaption(period)} · espèces encaissées moins les sorties.
              {scopedToSeller
                ? " Le solde est ce qui doit rester dans votre caisse."
                : " Le solde est ce qui doit rester en caisse pour toute l'équipe."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((item) => (
              <Link
                key={item.id}
                href={
                  item.id === "tout"
                    ? pageHref
                    : `${pageHref}?periode=${item.id}`
                }
                className={cn(
                  "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition",
                  period === item.id
                    ? "bg-white text-[#3d2416]"
                    : "bg-white/10 text-white hover:bg-white/15",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="relative mt-7 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-5 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f3c4a8]">
              Montant en caisse
            </p>
            <p
              className={cn(
                "display mt-2 text-4xl leading-none sm:text-5xl",
                cashNegative ? "text-amber-200" : "text-white",
              )}
            >
              {formatMoney(data.cashRemain)}
            </p>
            <p className="mt-3 text-sm text-white/70">
              {formatMoney(data.cashIn)} encaissés en espèces −{" "}
              {formatMoney(data.cashOut)} sortis
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                Encaissé
              </p>
              <p className="display mt-2 text-2xl text-emerald-200">
                + {formatMoney(data.collected)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                Sorties
              </p>
              <p className="display mt-2 text-2xl text-amber-200">
                − {formatMoney(data.spent)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Ventes réalisées
          </p>
          <p className="display mt-2 text-[1.7rem] leading-none text-brand">
            {formatMoney(data.salesTotal)}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            {data.sales.length} vente{data.sales.length > 1 ? "s" : ""}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Déjà encaissé
          </p>
          <p className="display mt-2 text-[1.7rem] leading-none text-brand">
            {formatMoney(data.salesPaid)}
          </p>
          <p className="mt-2 text-xs text-stone-500">Sur les ventes livrées</p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Reste à encaisser
          </p>
          <p className="display mt-2 text-[1.7rem] leading-none text-copper">
            {formatMoney(data.salesUnpaid)}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            {data.unpaidCount} vente{data.unpaidCount > 1 ? "s" : ""} ouverte
            {data.unpaidCount > 1 ? "s" : ""}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Sorties d&apos;argent
          </p>
          <p className="display mt-2 text-[1.7rem] leading-none text-brand">
            {formatMoney(data.spent)}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            {data.outflows.length} mouvement
            {data.outflows.length > 1 ? "s" : ""}
          </p>
        </Card>
      </div>

      {showSellers ? (
        <Card className="mt-4 sm:mt-6">
          <h2 className="display text-lg text-brand sm:text-xl">
            Par vendeur
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Encaissements et sorties de chaque membre de l&apos;équipe.
          </p>
          <div className="mt-4">
            <Table>
              <thead>
                <tr>
                  <Th>Vendeur</Th>
                  <Th>Encaissé</Th>
                  <Th>Sorties</Th>
                  <Th>Caisse</Th>
                </tr>
              </thead>
              <tbody>
                {data.sellers.map((seller) => (
                  <tr key={seller.id}>
                    <Td className="font-semibold text-brand">{seller.name}</Td>
                    <Td>{formatMoney(seller.collected)}</Td>
                    <Td>{formatMoney(seller.spent)}</Td>
                    <Td className="font-semibold">
                      {formatMoney(seller.cashIn - seller.cashOut)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : null}

      <Card className="mt-4 sm:mt-6">
        <h2 className="display text-lg text-brand sm:text-xl">
          Répartition des encaissements
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Seules les espèces alimentent la caisse physique.
        </p>
        <ul className="mt-4 space-y-3">
          {data.methods.map((method) => {
            const value = data.inByMethod[method];
            const out = data.outByMethod[method];
            const share = methodShare(value, methodTotal);
            return (
              <li key={method}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-brand">
                    {paymentMethodLabels[method]}
                  </span>
                  <span className="text-stone-600">
                    {formatMoney(value)}
                    {out > 0 ? ` · sorties ${formatMoney(out)}` : ""}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      method === "CASH" ? "bg-copper" : "bg-brand",
                    )}
                    style={{ width: `${Math.max(share, value > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="display text-lg text-brand sm:text-xl">
              Ventes réalisées
            </h2>
            <Link href={salesHref} className="text-sm font-semibold text-copper">
              {scopedToSeller ? "Commandes" : "Ventes"}
            </Link>
          </div>
          {data.sales.length === 0 ? (
            <EmptyState
              title="Aucune vente sur cette période"
              description="Les commandes clients apparaîtront ici avec le montant et l'encaissement."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Vente</Th>
                  <Th>Montant</Th>
                  <Th>Encaissé</Th>
                  <Th>Paiement</Th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((sale) => {
                  const pay = invoiceStatus(sale.paid, sale.total);
                  return (
                    <tr key={sale.id}>
                      <Td>
                        <Link
                          href={`${salesHref}/${sale.id}`}
                          className="font-semibold text-brand"
                        >
                          {sale.reference}
                        </Link>
                        <div className="text-xs text-stone-500">
                          {sale.customerName}
                          {scopedToSeller ? "" : ` · ${sale.createdByName}`} ·{" "}
                          {saleStatusLabels[sale.status]} ·{" "}
                          {formatDay(sale.deliveredAt ?? sale.createdAt)}
                        </div>
                      </Td>
                      <Td>{formatMoney(sale.total)}</Td>
                      <Td>{formatMoney(sale.paid)}</Td>
                      <Td>
                        <Badge
                          tone={
                            pay === "PAID"
                              ? "success"
                              : pay === "PARTIAL"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {paymentStatusLabels[pay]}
                        </Badge>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="display mb-1 text-lg text-brand sm:text-xl">
              Nouvelle sortie
            </h2>
            <p className="mb-4 text-sm text-stone-500">
              Dépense, versement au dépôt ou écart — ça sort de la caisse.
            </p>
            <CashOutflowForm />
          </Card>
          <Card>
            <h2 className="display mb-4 text-lg text-brand sm:text-xl">
              Sorties d&apos;argent
            </h2>
            {data.outflows.length === 0 ? (
              <EmptyState
                title="Aucune sortie"
                description="Enregistrez un retrait pour voir le solde de caisse diminuer."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.outflows.map((outflow) => (
                  <li
                    key={outflow.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-brand">
                        {cashOutflowReasonLabels[outflow.reason as CashOutflowReason]}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {paymentMethodLabels[outflow.method as PaymentMethod]}
                        {scopedToSeller ? "" : ` · ${outflow.createdByName}`} ·{" "}
                        {formatDate(outflow.paidAt)}
                        {outflow.notes ? ` · ${outflow.notes}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-copper">
                      − {formatMoney(outflow.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-4 sm:mt-6">
        <h2 className="display mb-1 text-lg text-brand sm:text-xl">
          Journal de caisse
        </h2>
        <p className="mb-4 text-sm text-stone-500">
          Entrées clients et sorties, du plus récent au plus ancien.
        </p>
        {data.journal.length === 0 ? (
          <EmptyState
            title="Aucun mouvement"
            description="Encaissez une vente ou enregistrez une sortie pour démarrer le journal."
          />
        ) : (
          <ul className="divide-y divide-line">
            {data.journal.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-brand">
                    {entry.href ? (
                      <Link href={entry.href}>{entry.label}</Link>
                    ) : (
                      cashOutflowReasonLabels[entry.label as CashOutflowReason] ??
                      entry.label
                    )}
                  </p>
                  <p className="truncate text-xs text-stone-500">
                    {paymentMethodLabels[entry.method]}
                    {scopedToSeller ? "" : ` · ${entry.createdByName}`} ·{" "}
                    {formatDate(entry.at)}
                    {entry.detail ? ` · ${entry.detail}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold",
                    entry.kind === "in" ? "text-emerald-800" : "text-copper",
                  )}
                >
                  {entry.kind === "in" ? "+" : "−"} {formatMoney(entry.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#3d2416] px-4 py-4 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f3c4a8]">
              Total en caisse
            </p>
            <p className="mt-1 text-xs text-white/65">
              Espèces encaissées − sorties
            </p>
          </div>
          <p
            className={cn(
              "display shrink-0 text-2xl leading-none sm:text-3xl",
              cashNegative ? "text-amber-200" : "text-white",
            )}
          >
            {formatFcfa(data.cashRemain)}
          </p>
        </div>
      </Card>
    </div>
  );
}
