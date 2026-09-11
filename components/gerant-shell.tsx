"use client";

import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { SessionShell } from "@/components/session-shell";

const GERANT_NAV = [
  { href: "/gerant", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/gerant/ventes", label: "Ventes", icon: ShoppingCart },
  { href: "/gerant/stock", label: "Stock", icon: Boxes },
  { href: "/gerant/achats", label: "Achats", icon: Truck },
  { href: "/gerant/factures", label: "Factures", icon: Receipt },
  { href: "/gerant/produits", label: "Boissons", icon: Package },
  { href: "/gerant/fournisseurs", label: "Fournisseurs", icon: ClipboardList },
];

export function GerantShell({
  user,
  children,
}: {
  user: { firstName: string; lastName: string; email: string };
  children: React.ReactNode;
}) {
  return (
    <SessionShell
      homeHref="/gerant"
      items={GERANT_NAV}
      subtitle="Session gérant"
      homeLabel="Dépôt"
      roleLabel="Gérant"
      accent="depot"
      user={user}
    >
      {children}
    </SessionShell>
  );
}
