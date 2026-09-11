import { AdminShell } from "@/components/admin-shell";
import { requireSessionRole } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionRole("ADMIN");
  return <AdminShell user={user}>{children}</AdminShell>;
}
