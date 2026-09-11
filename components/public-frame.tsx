import { AppHeader, type HeaderUser } from "@/components/app-header";

export function PublicFrame({
  user = null,
  children,
}: {
  user?: HeaderUser | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} showBrand />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
