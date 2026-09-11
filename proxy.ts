import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_COOKIE, SESSION_COOKIE } from "@/lib/constants";

const PUBLIC_PREFIXES = ["/connexion", "/inscription", "/api/session"];

const ROLE_HOMES = {
  ADMIN: "/admin",
  GERANT: "/gerant",
  VENDEUR: "/vendeur",
} as const;

type CookieRole = keyof typeof ROLE_HOMES;

function homeFromRole(role: string | undefined) {
  if (role === "ADMIN" || role === "GERANT" || role === "VENDEUR") {
    return ROLE_HOMES[role];
  }
  return "/";
}

function requestedRole(pathname: string): CookieRole | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "ADMIN";
  if (pathname === "/gerant" || pathname.startsWith("/gerant/")) return "GERANT";
  if (pathname === "/vendeur" || pathname.startsWith("/vendeur/")) return "VENDEUR";
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const cookieRole = request.cookies.get(ROLE_COOKIE)?.value;
  const isPublic = PUBLIC_PREFIXES.some((path) => pathname.startsWith(path));

  if (!hasSession && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && pathname === "/") {
    const home = homeFromRole(cookieRole);
    if (home !== "/") {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  const area = requestedRole(pathname);
  if (hasSession && area && cookieRole && cookieRole !== area) {
    const url = request.nextUrl.clone();
    url.pathname = homeFromRole(cookieRole);
    return NextResponse.redirect(url);
  }

  if (hasSession && cookieRole) {
    const rewritten = rewriteLegacyPath(pathname, cookieRole);
    if (rewritten) {
      const url = request.nextUrl.clone();
      url.pathname = rewritten;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

function rewriteLegacyPath(pathname: string, role: string) {
  const home = homeFromRole(role);
  if (pathname === "/accueil" || pathname.startsWith("/accueil/")) return home;

  const prefixes = [
    "/equipe",
    "/ventes",
    "/stock",
    "/achats",
    "/factures",
    "/produits",
    "/fournisseurs",
  ];
  for (const prefix of prefixes) {
    if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) continue;
    if (prefix === "/equipe" && role !== "ADMIN") return home;
    if (role === "VENDEUR" && prefix !== "/ventes" && prefix !== "/stock") {
      return home;
    }
    return `${home}${pathname}`;
  }
  return null;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
