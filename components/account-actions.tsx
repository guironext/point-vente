"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Ban,
  Clock3,
  Eye,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  UserRound,
  UserCheck,
  X,
} from "lucide-react";
import { updateUserAction, updateUserStatusAction } from "@/lib/actions/team";
import { UserAvatar } from "@/components/user-avatar";
import {
  Badge,
  Button,
  FieldError,
  FieldSuccess,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { roleLabels, userStatusLabels, userStatusTone } from "@/lib/labels";
import { cn, formatDate, fullName } from "@/lib/utils";
import type { Role, UserStatus } from "@/lib/types";

export type AccountUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  emergencyContact: string;
  city: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

type ModalMode = "view" | "edit" | null;

export function AccountActions({
  user,
  isSelf,
}: {
  user: AccountUser;
  isSelf: boolean;
}) {
  const [mode, setMode] = useState<ModalMode>(null);
  const close = useCallback(() => setMode(null), []);
  const canToggleStatus =
    !isSelf && (user.status === "ACTIVE" || user.status === "SUSPENDED");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton
        label={`Voir le compte de ${fullName(user)}`}
        onClick={() => setMode("view")}
      >
        <Eye className="h-4 w-4" />
      </IconButton>
      <IconButton
        label={`Modifier le compte de ${fullName(user)}`}
        onClick={() => setMode("edit")}
      >
        <Pencil className="h-4 w-4" />
      </IconButton>
      {canToggleStatus ? (
        <form action={updateUserStatusAction} className="ml-auto">
          <input type="hidden" name="userId" value={user.id} />
          <input
            type="hidden"
            name="status"
            value={user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
          />
          <button
            type="submit"
            className="inline-flex h-11 min-h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-brand transition hover:bg-background sm:h-9 sm:min-h-9"
          >
            {user.status === "ACTIVE" ? (
              <Ban className="h-3.5 w-3.5" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            {user.status === "ACTIVE" ? "Suspendre" : "Réactiver"}
          </button>
        </form>
      ) : null}
      {mode === "view" ? (
        <AccountModal title="Détail du compte" onClose={close}>
          <AccountDetails user={user} />
        </AccountModal>
      ) : null}
      {mode === "edit" ? (
        <AccountModal title="Modifier le compte" onClose={close} wide>
          <EditAccountForm user={user} isSelf={isSelf} onCancel={close} />
        </AccountModal>
      ) : null}
    </div>
  );
}

function AccountDetails({ user }: { user: AccountUser }) {
  const rows = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: Phone, label: "Contact", value: user.phone },
    {
      icon: UserRound,
      label: "Personne à contacter",
      value: user.emergencyContact,
    },
    { icon: MapPin, label: "Ville ou quartier", value: user.city },
    { icon: Shield, label: "Rôle", value: roleLabels[user.role] },
    { icon: Clock3, label: "Créé le", value: formatDate(user.createdAt) },
    { icon: Clock3, label: "Mis à jour le", value: formatDate(user.updatedAt) },
  ];

  return (
    <div>
      <div className="mb-5 flex items-start gap-3 rounded-2xl bg-background px-3 py-3 sm:px-4">
        <UserAvatar
          firstName={user.firstName}
          lastName={user.lastName}
          role={user.role}
          size="lg"
        />
        <div className="min-w-0">
          <p className="display text-xl leading-tight text-brand">
            {fullName(user)}
          </p>
          <p className="mt-1 break-all text-sm text-stone-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={userStatusTone(user.status)}>
              {userStatusLabels[user.status]}
            </Badge>
            <Badge>{roleLabels[user.role]}</Badge>
          </div>
        </div>
      </div>
      <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-3 px-3 py-3 sm:px-4"
          >
            <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                {row.label}
              </dt>
              <dd className="mt-0.5 break-words text-sm font-medium text-stone-900">
                {row.value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EditAccountForm({
  user,
  isSelf,
  onCancel,
}: {
  user: AccountUser;
  isSelf: boolean;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(updateUserAction, undefined);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="userId" value={user.id} />
      {isSelf ? (
        <>
          <input type="hidden" name="role" value={user.role} />
          <input type="hidden" name="status" value={user.status} />
        </>
      ) : null}
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          Identité
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`lastName-${user.id}`}>Nom</Label>
            <Input
              id={`lastName-${user.id}`}
              name="lastName"
              defaultValue={user.lastName}
              required
            />
          </div>
          <div>
            <Label htmlFor={`firstName-${user.id}`}>Prénoms</Label>
            <Input
              id={`firstName-${user.id}`}
              name="firstName"
              defaultValue={user.firstName}
              required
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          Contact
        </legend>
        <div>
          <Label htmlFor={`email-${user.id}`}>Email</Label>
          <Input
            id={`email-${user.id}`}
            name="email"
            type="email"
            defaultValue={user.email}
            required
          />
        </div>
        <div>
          <Label htmlFor={`phone-${user.id}`}>Téléphone</Label>
          <Input
            id={`phone-${user.id}`}
            name="phone"
            defaultValue={user.phone}
            required
          />
        </div>
        <div>
          <Label htmlFor={`emergencyContact-${user.id}`}>
            Personne à contacter en cas d&apos;urgence
          </Label>
          <Input
            id={`emergencyContact-${user.id}`}
            name="emergencyContact"
            defaultValue={user.emergencyContact}
            required
          />
        </div>
        <div>
          <Label htmlFor={`city-${user.id}`}>Ville ou quartier</Label>
          <Input
            id={`city-${user.id}`}
            name="city"
            defaultValue={user.city}
            required
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          Accès
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`role-${user.id}`}>Rôle</Label>
            <Select
              id={`role-${user.id}`}
              name={isSelf ? undefined : "role"}
              defaultValue={user.role}
              disabled={isSelf}
            >
              <option value="ADMIN">Administrateur</option>
              <option value="GERANT">Gérant</option>
              <option value="VENDEUR">Vendeur</option>
            </Select>
          </div>
          <div>
            <Label htmlFor={`status-${user.id}`}>Statut</Label>
            <Select
              id={`status-${user.id}`}
              name={isSelf ? undefined : "status"}
              defaultValue={user.status}
              disabled={isSelf}
            >
              <option value="PENDING_VALIDATION">En attente</option>
              <option value="ACTIVE">Actif</option>
              <option value="REJECTED">Refusé</option>
              <option value="SUSPENDED">Suspendu</option>
            </Select>
          </div>
        </div>
        {isSelf ? (
          <p className="text-xs text-stone-500">
            Vous ne pouvez pas modifier votre propre rôle ni votre statut.
          </p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          Mot de passe
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`password-${user.id}`}>Nouveau mot de passe</Label>
            <Input
              id={`password-${user.id}`}
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor={`confirm-${user.id}`}>Confirmation</Label>
            <Input
              id={`confirm-${user.id}`}
              name="confirm"
              type="password"
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>
        <p className="text-xs text-stone-500">
          Laissez vide pour conserver le mot de passe actuel.
        </p>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 min-h-11 w-full items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-brand transition hover:bg-background sm:w-auto"
        >
          Annuler
        </button>
        <Button disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function AccountModal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Fermer"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(20,53,44,0.55)] sm:max-h-[88vh] sm:rounded-3xl",
          wide ? "sm:max-w-xl" : "sm:max-w-lg",
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" />
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h3 id={titleId} className="display text-lg text-brand sm:text-xl">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-500 hover:bg-background hover:text-brand"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="safe-bottom overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 min-h-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-brand transition hover:bg-background sm:h-9 sm:w-9 sm:min-h-9"
    >
      {children}
    </button>
  );
}
