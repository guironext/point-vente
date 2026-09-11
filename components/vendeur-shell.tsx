"use client";

import { Boxes, LayoutDashboard, ShoppingCart } from "lucide-react";
import { SessionShell } from "@/components/session-shell";

const VENDEUR_NAV = [
  { href: "/vendeur", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/vendeur/ventes", label: "Commandes", icon: ShoppingCart },
  { href: "/vendeur/stock", label: "Stock", icon: Boxes },
];

export function VendeurShell({
  user,
  children,
}: {
  user: { firstName: string; lastName: string; email: string };
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
