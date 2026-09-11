import Link from "next/link";
import { Card, StatCard, buttonClass } from "@/components/ui";
import {
  DashboardHero,
  LowStockList,
  OpenSalesList,
} from "@/components/dashboard-widgets";
import { requireSessionRole } from "@/lib/auth";
import {
  getDeliveredRevenue,
  getOpenSales,
  getStockOverview,
} from "@/lib/dashboard";
import { formatMoney } from "@/lib/utils";

export default async function VendeurDashboardPage() {
  const user = await requireSessionRole("VENDEUR");
  const [stock, openSales, revenue] = await Promise.all([
    getStockOverview(),
    getOpenSales(user.id),
    getDeliveredRevenue(user.id),
  ]);

  return (
    <div className="pb-6">
      <DashboardHero
        eyebrow="Livraisons"
        title="Tableau de bord vendeur"
        greeting={`Bonjour ${user.firstName}. Prenez les commandes, livrez les boissons et consultez le stock.`}
        tone="seller"
      >
        <Link href="/vendeur/ventes/nouvelle" className={buttonClass()}>
          Nouvelle commande client
        </Link>
        <Link
          href="/vendeur/ventes"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto"
        >
          Mes commandes
        </Link>
      </DashboardHero>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Mes commandes ouvertes" value={String(openSales.length)} />
        <StatCard label="Mon CA livré" value={formatMoney(revenue)} hint="Livraisons effectuées" />
        <StatCard
          label="Alertes stock"
          value={String(stock.lowStock.length)}
          hint="Consultation uniquement"
          alert={stock.lowStock.length > 0}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:mt-8 lg:grid-cols-2 lg:gap-6">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="display text-lg text-brand sm:text-xl">À livrer</h2>
            <Link href="/vendeur/ventes" className="shrink-0 text-sm font-semibold text-copper">
              Voir tout
            </Link>
          </div>
          <OpenSalesList
            orders={openSales}
            hrefFor={(id) => `/vendeur/ventes/${id}`}
            empty="Aucune de vos commandes n'est ouverte."
          />
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="display text-lg text-brand sm:text-xl">Stock bas</h2>
            <Link href="/vendeur/stock" className="shrink-0 text-sm font-semibold text-copper">
              Inventaire
            </Link>
          </div>
          <LowStockList items={stock.lowStock} />
        </Card>
      </div>
    </div>
  );
}
