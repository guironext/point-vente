import type { Role } from "@/lib/types";

export function canPurchase(role: Role) {
  return role === "ADMIN" || role === "GERANT";
}

export function canManageTeam(role: Role) {
  return role === "ADMIN";
}

export function canAdjustStock(role: Role) {
  return role === "ADMIN" || role === "GERANT";
}
