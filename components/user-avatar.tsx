import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

export function UserAvatar({
  firstName,
  lastName,
  role,
  size = "md",
}: {
  firstName: string;
  lastName: string;
  role: Role;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-9 w-9 text-[11px]",
    md: "h-11 w-11 text-xs",
    lg: "h-14 w-14 text-sm",
  };
  const colors: Record<Role, string> = {
    ADMIN: "bg-brand text-white",
    GERANT: "bg-brand-2 text-white",
    VENDEUR: "bg-copper text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizes[size],
        colors[role],
      )}
    >
      {firstName.charAt(0)}
      {lastName.charAt(0)}
    </span>
  );
}
