import { GerantShell } from "@/components/gerant-shell";
import { requireSessionRole } from "@/lib/auth";

export default async function GerantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionRole("GERANT");
  return (
    <GerantShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      }}
    >
      {children}
    </GerantShell>
  );
}
