import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms";
import { Mark } from "@/components/mark";
import { PublicFrame } from "@/components/public-frame";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { sessionBase } from "@/lib/session";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user?.status === "ACTIVE") redirect(sessionBase(user.role));
  if (user?.status === "PENDING_VALIDATION") redirect("/onboarding");

  return (
    <PublicFrame>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <Mark className="h-14 w-14" />
            </div>
            <h1 className="display text-4xl text-brand">Afrik-Event</h1>
            <p className="mt-2 text-sm text-stone-600">
              Gestion des casiers, cartons et ventes de boissons
            </p>
          </div>
          <Card>
            <LoginForm />
          </Card>
          <p className="mt-4 text-center text-xs text-stone-500">
            L&apos;accès se fait uniquement sur invitation.
            <br />
            Démo admin : <span className="font-medium">admin@pointvente.local</span> /{" "}
            <span className="font-medium">Admin1234</span>
          </p>
          <p className="mt-2 text-center text-xs text-stone-400">
            <Link href="/inscription" className="underline">
              J&apos;ai un lien d&apos;invitation
            </Link>
          </p>
        </div>
      </div>
    </PublicFrame>
  );
}
