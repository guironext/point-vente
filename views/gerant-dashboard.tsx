import Link from "next/link";
import { Card, StatCard, buttonClass } from "@/components/ui";
import {
  DashboardHero,
  LowStockList,
  OpenSalesList,
  ShortcutGrid,
} from "@/components/dashboard-widgets";
import { requireSessionRole } from "@/lib/auth";
import {
  getDeliveredRevenue,
  getIncomingPurchasesCount,
  getOpenSales,
  getStockOverview,
  getSupplierDebt,
} from "@/lib/dashboard";
import { formatMoney } from "@/lib/utils";

export default async function GerantDashboardPage() {
  const user = await requireSessionRole("GERANT");
  const [stock, openSales, revenue, due, incomingPurchases] = await Promise.all([
    getStockOverview(),
    getOpenSales(),
    getDeliveredRevenue(),
    getSupplierDebt(),
    getIncomingPurchasesCount(),
  ]);

  return (
    <div className="pb-6">
      <DashboardHero
        eyebrow="Dépôt"
        title="Tableau de bord gérant"
        greeting={`Bonjour ${user.firstName}. Gérez le catalogue, les achats, les factures et le stock du dépôt.`}
        tone="depot"
      >
        <Link href="/gerant/achats/nouvelle" className={buttonClass()}>
          Commander au fournisseur
        </Link>
        <Link
          href="/gerant/ventes/nouvelle"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto"
        >
          Nouvelle vente
        </Link>
      </DashboardHero>

      <ShortcutGrid
        items={[
          { href: "/gerant/achats", label: "Achats", hint: "Commandes fournisseurs" },
          { href: "/gerant/stock", label: "Stock", hint: "Réception et inventaire" },
          { href: "/gerant/factures", label: "Factures", hint: "Paiements fournisseurs" },
          { href: "/gerant/produits", label: "Boissons", hint: "Catalogue du dépôt" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Réceptions en attente"
          value={String(incomingPurchases)}
          alert={incomingPurchases > 0}
        />
        <StatCard
          label="Stock restant"
          value={`${stock.remaining} u.`}
          hint={`${stock.incoming} entrées · ${stock.sold} vendues`}
        />
        <StatCard label="CA livré" value={formatMoney(revenue)} />
        <StatCard label="Dettes fournisseurs" value={formatMoney(due)} alert={due > 0} />
      </div>

      <div className="mt-6 grid gap-4 lg:mt-8 lg:grid-cols-2 lg:gap-6">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="display text-lg text-brand sm:text-xl">À livrer</h2>
            <Link href="/gerant/ventes" className="shrink-0 text-sm font-semibold text-copper">
              Voir tout
            </Link>
          </div>
          <OpenSalesList
            orders={openSales}
            hrefFor={(id) => `/gerant/ventes/${id}`}
            empty="Aucune commande client ouverte."
          />
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="display text-lg text-brand sm:text-xl">Stock bas</h2>
            <Link href="/gerant/stock" className="shrink-0 text-sm font-semibold text-copper">
              Inventaire
            </Link>
          </div>
          <LowStockList items={stock.lowStock} />
        </Card>
      </div>
    </div>
  );
}
