import type { Role } from "@/lib/types";

export type SessionBase = "/admin" | "/gerant" | "/vendeur";

export const SESSION_BASES: SessionBase[] = ["/admin", "/gerant", "/vendeur"];

export function sessionBase(role: Role): SessionBase {
  if (role === "ADMIN") return "/admin";
  if (role === "GERANT") return "/gerant";
  return "/vendeur";
}

export function pathFor(role: Role, suffix = "") {
  const base = sessionBase(role);
  if (!suffix || suffix === "/") return base;
  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

export function ordersSuffix(role: Role) {
  return role === "ADMIN" ? "/commandes" : "/ventes";
}

export function allSessionPaths(suffix: string) {
  const path =
    !suffix || suffix === "/"
      ? ""
      : suffix.startsWith("/")
        ? suffix
        : `/${suffix}`;
  return SESSION_BASES.map((base) => `${base}${path}`);
}

export const ROLE_NAV: Record<
  Role,
  { href: string; label: string }[]
> = {
  ADMIN: [
    { href: "/", label: "Accueil" },
    { href: "/equipe", label: "Équipe" },
    { href: "/ventes", label: "Ventes" },
    { href: "/stock", label: "Stock" },
    { href: "/achats", label: "Achats" },
    { href: "/factures", label: "Factures" },
    { href: "/produits", label: "Boissons" },
    { href: "/fournisseurs", label: "Fournisseurs" },
  ],
  GERANT: [
    { href: "/", label: "Accueil" },
    { href: "/ventes", label: "Ventes" },
    { href: "/stock", label: "Stock" },
    { href: "/achats", label: "Achats" },
    { href: "/factures", label: "Factures" },
    { href: "/produits", label: "Boissons" },
    { href: "/fournisseurs", label: "Fournisseurs" },
  ],
  VENDEUR: [
    { href: "/", label: "Accueil" },
    { href: "/ventes", label: "Commandes" },
    { href: "/stock", label: "Stock" },
  ],
};

export const ROLE_SHELL: Record<
  Role,
  { subtitle: string; homeLabel: string }
> = {
  ADMIN: {
    subtitle: "Session administrateur",
    homeLabel: "Pilotage",
  },
  GERANT: {
    subtitle: "Session gérant",
    homeLabel: "Dépôt",
  },
  VENDEUR: {
    subtitle: "Session vendeur",
    homeLabel: "Livraisons",
  },
};
