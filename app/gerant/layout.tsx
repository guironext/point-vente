import { GerantShell } from "@/components/gerant-shell";
import { requireSessionRole } from "@/lib/auth";

export default async function GerantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionRole("GERANT");
  return <GerantShell user={user}>{children}</GerantShell>;
}
