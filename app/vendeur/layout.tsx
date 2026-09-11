import { VendeurShell } from "@/components/vendeur-shell";
import { requireSessionRole } from "@/lib/auth";

export default async function VendeurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionRole("VENDEUR");
  return (
    <VendeurShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      }}
    >
      {children}
    </VendeurShell>
  );
}
