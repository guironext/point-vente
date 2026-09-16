import type {
  CashOutflowReason,
  CustomerOrderStatus,
  PackagingType,
  PaymentMethod,
  PaymentStatus,
  PurchaseOrderStatus,
  Role,
  UserStatus,
} from "@/lib/types";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrateur",
  GERANT: "Gérant",
  VENDEUR: "Vendeur",
};

export const userStatusLabels: Record<UserStatus, string> = {
  PENDING_VALIDATION: "En attente",
  ACTIVE: "Actif",
  REJECTED: "Refusé",
  SUSPENDED: "Suspendu",
};

export function userStatusTone(status: UserStatus) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PENDING_VALIDATION") return "warning" as const;
  if (status === "SUSPENDED" || status === "REJECTED") return "danger" as const;
  return "neutral" as const;
}

export const packagingLabels: Record<PackagingType, string> = {
  CASIER: "Casier",
  CARTON: "Carton",
};

export const purchaseStatusLabels: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyée",
  PARTIALLY_RECEIVED: "Réception partielle",
  RECEIVED: "Reçue",
  CANCELLED: "Annulée",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  UNPAID: "Impayé",
  PARTIAL: "Partiel",
  PAID: "Payé",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Espèces",
  TRANSFER: "Virement",
  MOBILE_MONEY: "Mobile money",
  CHECK: "Chèque",
  OTHER: "Autre",
};

export const cashOutflowReasonLabels: Record<CashOutflowReason, string> = {
  DEPENSE: "Dépense",
  VERSEMENT: "Versement au Responsable",
  ACHAT: "Achat divers",
  ECART: "Écart de caisse",
  AUTRE: "Autre",
};

export const saleStatusLabels: Record<CustomerOrderStatus, string> = {
  DRAFT: "Brouillon",
  CONFIRMED: "Confirmée",
  OUT_FOR_DELIVERY: "En livraison",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

export function invoiceStatus(paid: number, total: number): PaymentStatus {
  if (paid <= 0) return "UNPAID";
  if (paid >= total) return "PAID";
  return "PARTIAL";
}
