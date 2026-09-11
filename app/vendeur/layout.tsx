import { VendeurShell } from "@/components/vendeur-shell";
import { requireSessionRole } from "@/lib/auth";

export default async function VendeurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionRole("VENDEUR");
  return <VendeurShell user={user}>{children}</VendeurShell>;
}
