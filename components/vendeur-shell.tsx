"use client";

import { Boxes, LayoutDashboard, Receipt, ShoppingCart, Wallet } from "lucide-react";
import { SessionShell } from "@/components/session-shell";
import type { HeaderUser } from "@/components/app-header";

const VENDEUR_NAV = [
  { href: "/vendeur", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/vendeur/approvisionnements", label: "Approvisionnements", icon: ShoppingCart },
  { href: "/vendeur/stock", label: "Stock", icon: Boxes },
  { href: "/vendeur/factures", label: "Factures", icon: Receipt },
  { href: "/vendeur/comptabilite", label: "Comptabilité", icon: Wallet },
];

export function VendeurShell({
  user,
  children,
}: {
  user: HeaderUser;
  children: React.ReactNode;
}) {
  return (
    <SessionShell
      homeHref="/vendeur"
      items={VENDEUR_NAV}
      subtitle="Session vendeur"
      homeLabel="Livraisons"
      roleLabel="Vendeur"
      accent="seller"
      user={user}
    >
      {children}
    </SessionShell>
  );
}
