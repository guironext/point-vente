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
  getOpenSales,
  getPendingUserCount,
  getStockOverview,
  getSupplierDebt,
} from "@/lib/dashboard";
import { formatMoney } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const user = await requireSessionRole("ADMIN");
  const [stock, openSales, revenue, due, pendingUsers] = await Promise.all([
    getStockOverview(),
    getOpenSales(),
    getDeliveredRevenue(),
    getSupplierDebt(),
    getPendingUserCount(),
  ]);

  return (
    <div className="pb-6">
      <DashboardHero
        eyebrow="Pilotage"
        title="Tableau de bord administrateur"
        greeting={`Bonjour ${user.firstName}. Vue d'ensemble de l'équipe, des ventes, du stock et des fournisseurs.`}
      >
        <Link href="/admin/equipe" className={buttonClass()}>
          Gérer l&apos;équipe
        </Link>
        <Link
          href="/admin/commandes/nouvelle"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto"
        >
          Nouvelle Commande
        </Link>
      </DashboardHero>

      <ShortcutGrid
        items={[
          { href: "/admin/equipe", label: "Équipe", hint: "Invitations et validation" },
          { href: "/admin/commandes", label: "Commandes", hint: "Commandes clients" },
          { href: "/admin/fournisseurs", label: "Fournisseurs", hint: "Commandes fournisseurs" },
          { href: "/admin/stock", label: "Stock", hint: "Inventaire des produits" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Comptes à valider"
          value={String(pendingUsers)}
          alert={pendingUsers > 0}
        />
        <StatCard label="CA livré" value={formatMoney(revenue)} hint="Toutes les livraisons" />
        <StatCard
          label="Stock restant"
          value={`${stock.remaining} u.`}
          hint={`${stock.incoming} entrées · ${stock.sold} vendues`}
        />
        <StatCard label="Dettes fournisseurs" value={formatMoney(due)} alert={due > 0} />
      </div>

      <div className="mt-6 grid gap-4 lg:mt-8 lg:grid-cols-2 lg:gap-6">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="display text-lg text-brand sm:text-xl">À livrer</h2>
            <Link href="/admin/commandes" className="shrink-0 text-sm font-semibold text-copper">
              Voir tout
            </Link>
          </div>
          <OpenSalesList
            orders={openSales}
            hrefFor={(id) => `/admin/commandes/${id}`}
            empty="Aucune commande client ouverte."
          />
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="display text-lg text-brand sm:text-xl">Stock bas</h2>
            <Link href="/admin/stock" className="shrink-0 text-sm font-semibold text-copper">
              Inventaire
            </Link>
          </div>
          <LowStockList items={stock.lowStock} />
        </Card>
      </div>
    </div>
  );
}
