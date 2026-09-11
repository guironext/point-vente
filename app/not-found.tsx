import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sessionBase } from "@/lib/session";

export default async function NotFound() {
  const user = await getCurrentUser();
  const href =
    user && user.status === "ACTIVE" ? sessionBase(user.role) : "/connexion";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="display text-4xl text-brand">Page introuvable</h1>
      <p className="mt-3 text-sm text-stone-600">
        Cette ressource n&apos;existe pas ou vous n&apos;y avez pas accès.
      </p>
      <Link href={href} className="mt-6 text-sm font-semibold text-copper">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
