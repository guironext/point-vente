import { SignupForm } from "@/components/forms";
import { Mark } from "@/components/mark";
import { PublicFrame } from "@/components/public-frame";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/types";

type Invite = {
  token: string;
  email: string;
  role: Role;
  usedAt: Date | null;
  expiresAt: Date;
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const invitation = token
    ? ((await prisma.invitation.findUnique({ where: { token } })) as Invite | null)
    : null;
  const valid =
    invitation && !invitation.usedAt && invitation.expiresAt >= new Date();

  return (
    <PublicFrame>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <Mark className="h-12 w-12" />
            </div>
            <h1 className="display text-3xl text-brand">Créer votre compte</h1>
          </div>
          <Card>
            {valid && invitation ? (
              <SignupForm
                token={invitation.token}
                email={invitation.email}
                role={invitation.role}
              />
            ) : (
              <p className="text-sm text-stone-600">
                Lien d&apos;invitation manquant, expiré ou déjà utilisé. Demandez
                une nouvelle invitation à l&apos;administrateur.
              </p>
            )}
          </Card>
        </div>
      </div>
    </PublicFrame>
  );
}
