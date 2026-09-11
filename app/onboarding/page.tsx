import { logoutAction, refreshOnboarding } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth";
import { fullName } from "@/lib/utils";
import { roleLabels } from "@/lib/labels";
import { Button, Card } from "@/components/ui";
import { Mark } from "@/components/mark";
import { redirect } from "next/navigation";
import { sessionBase } from "@/lib/session";

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.status === "ACTIVE") redirect(sessionBase(user.role));
  if (user.status !== "PENDING_VALIDATION") {
    redirect("/connexion");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Mark className="h-12 w-12" />
          </div>
          <h1 className="display text-3xl text-brand">En attente de validation</h1>
        </div>
        <Card className="space-y-4">
          <p className="text-sm leading-6 text-stone-600">
            Bonjour <strong>{fullName(user)}</strong>. Votre compte{" "}
            <strong>{roleLabels[user.role]}</strong> a bien été créé. Un
            administrateur doit le valider avant l&apos;ouverture de votre
            session de travail.
          </p>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-stone-500">Contact</dt>
              <dd>{user.phone}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Urgence</dt>
              <dd>{user.emergencyContact}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Ville / quartier</dt>
              <dd>{user.city}</dd>
            </div>
          </dl>
          <form action={refreshOnboarding}>
            <Button variant="secondary" className="w-full">
              Vérifier si mon compte est validé
            </Button>
          </form>
          <form action={logoutAction}>
            <Button variant="ghost" className="w-full">
              Se déconnecter
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
