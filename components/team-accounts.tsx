"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AccountActions, type AccountUser } from "@/components/account-actions";
import { UserAvatar } from "@/components/user-avatar";
import { Badge, EmptyState, Input } from "@/components/ui";
import { roleLabels, userStatusLabels, userStatusTone } from "@/lib/labels";
import { fullName } from "@/lib/utils";

export function TeamAccounts({
  users,
  currentUserId,
}: {
  users: AccountUser[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const haystack = [
        fullName(user),
        user.email,
        user.phone,
        user.city,
        roleLabels[user.role],
        userStatusLabels[user.status],
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, users]);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un compte…"
          aria-label="Rechercher un compte"
          className="pl-10"
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun compte trouvé"
          description="Modifiez la recherche ou invitez un nouveau membre."
        />
      ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
          {filtered.map((user) => (
            <li
              key={user.id}
              className="rounded-2xl border border-line bg-white/70 p-3.5 sm:p-4"
            >
              <div className="flex items-start gap-3">
                <UserAvatar
                  firstName={user.firstName}
                  lastName={user.lastName}
                  role={user.role}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-stone-900">
                      {fullName(user)}
                    </p>
                    {user.id === currentUserId ? (
                      <Badge tone="info">Vous</Badge>
                    ) : null}
                    <Badge tone={userStatusTone(user.status)}>
                      {userStatusLabels[user.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-stone-500">
                    {user.email}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {roleLabels[user.role]}
                    {user.city ? ` · ${user.city}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-3 border-t border-line pt-3">
                <AccountActions user={user} isSelf={user.id === currentUserId} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
