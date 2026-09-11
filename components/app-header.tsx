"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LogIn, LogOut, Menu, Search } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Mark } from "@/components/mark";
import { logoutAction } from "@/lib/actions/auth";
import { searchApp, type SearchHit } from "@/lib/actions/search";
import { roleLabels } from "@/lib/labels";
import type { Role } from "@/lib/types";
import { fullName } from "@/lib/utils";

export type HeaderUser = {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
};

export function AppHeader({
  user,
  onOpenMenu,
  showMenuButton = false,
  showBrand = false,
}: {
  user: HeaderUser | null;
  onOpenMenu?: () => void;
  showMenuButton?: boolean;
  showBrand?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const connected = Boolean(user);

  useEffect(() => {
    const q = query.trim();
    if (!connected || q.length < 2) {
      setHits([]);
      setPending(false);
      return;
    }

    let cancelled = false;
    setPending(true);
    const timer = window.setTimeout(() => {
      void searchApp(q)
        .then((next) => {
          if (cancelled) return;
          setHits(next);
          setOpen(true);
          setPending(false);
        })
        .catch(() => {
          if (cancelled) return;
          setHits([]);
          setPending(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, connected]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <header className="safe-top sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 lg:px-6">
        {showMenuButton ? (
          <button
            type="button"
            onClick={onOpenMenu}
            className="rounded-xl p-2 text-brand hover:bg-background lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}

        {showBrand ? (
          <Link href={user ? "/" : "/connexion"} className="hidden items-center gap-2 sm:flex">
            <Mark className="h-9 w-9 shrink-0" />
            <span className="display text-lg leading-none text-brand">Afrik-Event</span>
          </Link>
        ) : null}

        <div ref={boxRef} className="relative min-w-0 flex-1">
          <label htmlFor="app-search" className="sr-only">
            Rechercher
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            id="app-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (hits.length || query.trim().length >= 2) setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
              if (event.key === "Enter" && hits[0]) {
                event.preventDefault();
                goTo(hits[0].href);
              }
            }}
            placeholder={
              connected
                ? "Rechercher une boisson, une commande…"
                : "Connectez-vous pour rechercher"
            }
            disabled={!connected}
            autoComplete="off"
            role="combobox"
            aria-expanded={open && connected}
            aria-controls={listId}
            className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-10 text-sm text-stone-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
          />
          {connected && open && query.trim().length >= 2 ? (
            <div
              id={listId}
              role="listbox"
              className="absolute top-[calc(100%+0.4rem)] left-0 z-30 max-h-80 w-full overflow-auto rounded-2xl border border-line bg-paper shadow-[0_18px_40px_-24px_rgba(20,53,44,0.55)]"
            >
              {pending && hits.length === 0 ? (
                <p className="px-4 py-3 text-sm text-stone-500">Recherche…</p>
              ) : hits.length === 0 ? (
                <p className="px-4 py-3 text-sm text-stone-500">
                  Aucun résultat pour « {query.trim()} ».
                </p>
              ) : (
                <ul>
                  {hits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        role="option"
                        onClick={() => goTo(hit.href)}
                        className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-background"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-copper">
                          {hit.group}
                        </span>
                        <span className="text-sm font-semibold text-brand">
                          {hit.title}
                        </span>
                        {hit.subtitle ? (
                          <span className="truncate text-xs text-stone-500">
                            {hit.subtitle}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        {user ? (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="min-w-0 max-w-[7.5rem] text-right sm:max-w-[14rem]">
              <p className="truncate text-sm font-semibold text-brand">
                {fullName(user)}
              </p>
              <p className="truncate text-[11px] uppercase tracking-[0.14em] text-stone-400">
                {roleLabels[user.role]}
              </p>
            </div>
            <UserAvatar
              firstName={user.firstName}
              lastName={user.lastName}
              role={user.role}
              size="sm"
            />
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Se déconnecter"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-brand hover:bg-background"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Se déconnecter</span>
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/connexion"
            aria-label="Se connecter"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-copper px-3 text-sm font-semibold text-white hover:bg-[#a84b1d]"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Se connecter</span>
          </Link>
        )}
      </div>
    </header>
  );
}
