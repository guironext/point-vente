"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { LogOut, Menu, X } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { cn, fullName } from "@/lib/utils";
import { Mark } from "@/components/mark";

export type SessionNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export function SessionShell({
  homeHref,
  items,
  subtitle,
  homeLabel,
  roleLabel,
  accent,
  user,
  children,
}: {
  homeHref: string;
  items: SessionNavItem[];
  subtitle: string;
  homeLabel: string;
  roleLabel: string;
  accent: "brand" | "depot" | "seller";
  user: { firstName: string; lastName: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = items.find((item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex min-h-dvh">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[min(18.5rem,88vw)] flex-col text-white transition-transform duration-200 ease-out lg:static lg:w-72 lg:translate-x-0",
            accent === "seller"
              ? "bg-[#3d2416]"
              : accent === "depot"
                ? "bg-[#1a4338]"
                : "bg-brand",
            open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="safe-top flex h-full flex-col px-4 py-5 sm:px-5">
            <div className="mb-7 flex items-start justify-between gap-3">
              <Link
                href={homeHref}
                onClick={() => setOpen(false)}
                className="flex min-w-0 items-center gap-3"
              >
                <Mark className="h-10 w-10 shrink-0" />
                <div className="min-w-0">
                  <p className="display text-xl leading-none">Point Vente</p>
                  <p className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-white/60">
                    {subtitle}
                  </p>
                </div>
              </Link>
              <button
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-white/15 text-white shadow-inner"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="safe-bottom mt-4 rounded-2xl bg-white/8 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-copper text-sm font-semibold">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{fullName(user)}</p>
                  <p className="truncate text-xs text-white/60">{roleLabel}</p>
                </div>
              </div>
              <form action={logoutAction} className="mt-3">
                <button className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[#f3c4a8] hover:underline">
                  <LogOut className="h-3.5 w-3.5" />
                  Se déconnecter
                </button>
              </form>
            </div>
          </div>
        </aside>
        {open ? (
          <button
            className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="safe-top sticky top-0 z-20 border-b border-line bg-paper/90 px-3 py-2.5 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setOpen(true)}
                className="rounded-xl p-2 text-brand hover:bg-background"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 text-center">
                <p className="display truncate text-lg leading-none text-brand">
                  {current?.label ?? homeLabel}
                </p>
                <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.16em] text-stone-400">
                  {roleLabel}
                </p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">
                {user.firstName.charAt(0)}
                {user.lastName.charAt(0)}
              </span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
