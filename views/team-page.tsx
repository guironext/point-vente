import type { ReactNode } from "react";
import { Clock3, Link2, UserPlus, Users } from "lucide-react";
import { type AccountUser } from "@/components/account-actions";
import { CopyButton, InviteForm } from "@/components/forms";
import { TeamAccounts } from "@/components/team-accounts";
import { UserAvatar } from "@/components/user-avatar";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { roleLabels } from "@/lib/labels";
import { fullName, formatDate } from "@/lib/utils";
import { validateUserAction } from "@/lib/actions/team";
import type { Role } from "@/lib/types";

type OpenInvite = {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: Date;
};

export default async function TeamPage() {
  const admin = await requireRoles(["ADMIN"]);
  const [usersRaw, invitations] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        emergencyContact: true,
        city: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.invitation.findMany({
      where: { usedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const users: AccountUser[] = usersRaw.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));
  const openInvites = invitations as OpenInvite[];
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const pending = users.filter((u) => u.status === "PENDING_VALIDATION");
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow="Administration"
        title="Équipe"
        description="Invitez, validez et pilotez les comptes avant l'accès à la session."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Comptes" value={String(users.length)} />
        <StatCard label="Actifs" value={String(activeCount)} />
        <StatCard
          label="À valider"
          value={String(pending.length)}
          alert={pending.length > 0}
        />
        <StatCard label="Invitations" value={String(openInvites.length)} />
      </div>

      <Card className="mb-6">
        <SectionTitle
          icon={<UserPlus className="h-4 w-4" />}
          title="Nouvelle invitation"
          hint="Un lien valable 7 jours est généré pour le rôle choisi."
        />
        <InviteForm />
      </Card>

      {pending.length > 0 ? (
        <Card className="mb-6">
          <SectionTitle
            icon={<Clock3 className="h-4 w-4" />}
            title="En attente de validation"
            count={pending.length}
            hint="Ces comptes ne peuvent pas encore ouvrir une session."
          />
          <ul className="grid gap-3 lg:grid-cols-2">
            {pending.map((user) => (
              <li
                key={user.id}
                className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 sm:p-4"
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-copper" />
                <div className="flex items-start gap-3 pl-2">
                  <UserAvatar
                    firstName={user.firstName}
                    lastName={user.lastName}
                    role={user.role}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-900">
                      {fullName(user)}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {user.email}
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      {roleLabels[user.role]} · {user.phone}
                      {user.city ? ` · ${user.city}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 pl-2">
                  <form action={validateUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <Button className="h-11 w-full text-sm">Valider</Button>
                  </form>
                  <form action={validateUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <Button variant="danger" className="h-11 w-full text-sm">
                      Refuser
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mb-6">
        <SectionTitle
          icon={<Link2 className="h-4 w-4" />}
          title="Invitations ouvertes"
          count={openInvites.length}
        />
        {openInvites.length === 0 ? (
          <EmptyState
            title="Aucune invitation active"
            description="Créez un lien pour un gérant, un vendeur ou un administrateur."
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {openInvites.map((invite) => {
              const url = `${appUrl}/inscription?token=${invite.token}`;
              return (
                <li
                  key={invite.id}
                  className="rounded-2xl border border-line bg-white/70 p-3.5 sm:p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-900">
                        {invite.email}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Expire le {formatDate(invite.expiresAt)}
                      </p>
                    </div>
                    <Badge>{roleLabels[invite.role]}</Badge>
                  </div>
                  <p className="mt-3 break-all rounded-xl bg-background px-3 py-2 font-mono text-[11px] text-stone-500">
                    {url}
                  </p>
                  <div className="mt-3">
                    <CopyButton value={url} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle
          icon={<Users className="h-4 w-4" />}
          title="Comptes"
          count={users.length}
          hint="Consultez, modifiez ou suspendez un compte existant."
        />
        <TeamAccounts users={users} currentUserId={admin.id} />
      </Card>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  hint,
  count,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  count?: number;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
            {icon}
          </span>
          <h2 className="display text-lg text-brand sm:text-xl">{title}</h2>
        </div>
        {hint ? (
          <p className="mt-1 text-xs leading-5 text-stone-500 sm:text-sm">
            {hint}
          </p>
        ) : null}
      </div>
      {count != null ? <Badge>{count}</Badge> : null}
    </div>
  );
}
