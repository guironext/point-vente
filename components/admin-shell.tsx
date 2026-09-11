"use client";

import {
  Boxes,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { SessionShell } from "@/components/session-shell";
import type { HeaderUser } from "@/components/app-header";

const ADMIN_NAV = [
  { href: "/admin", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/admin/equipe", label: "Équipe", icon: Users },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingCart },
  { href: "/admin/stock", label: "Stock", icon: Boxes },
  { href: "/admin/fournisseurs", label: "Fournisseurs", icon: ClipboardList },
  { href: "/admin/produits", label: "Boissons", icon: Package },
  { href: "/admin/factures", label: "Factures", icon: Receipt },
  { href: "/admin/comptabilite", label: "Comptabilité", icon: CreditCard },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

export function AdminShell({
  user,
  children,
}: {
  user: HeaderUser;
  children: React.ReactNode;
}) {
  return (
    <SessionShell
      homeHref="/admin"
      items={ADMIN_NAV}
      subtitle="Session administrateur"
      homeLabel="Pilotage"
      roleLabel="Administrateur"
      accent="brand"
      user={user}
    >
      {children}
    </SessionShell>
  );
}
