export type Role = "ADMIN" | "GERANT" | "VENDEUR";
export type UserStatus =
  | "PENDING_VALIDATION"
  | "ACTIVE"
  | "REJECTED"
  | "SUSPENDED";
export type PackagingType = "CASIER" | "CARTON";
export type PurchaseOrderStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type PaymentMethod =
  | "CASH"
  | "TRANSFER"
  | "MOBILE_MONEY"
  | "CHECK"
  | "OTHER";
export type StockMovementType = "IN" | "OUT" | "ADJUST";
export type CashOutflowReason =
  | "DEPENSE"
  | "VERSEMENT"
  | "ACHAT"
  | "ECART"
  | "AUTRE";
export type CustomerOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export const ROLES: Role[] = ["ADMIN", "GERANT", "VENDEUR"];
export const USER_STATUSES: UserStatus[] = [
  "PENDING_VALIDATION",
  "ACTIVE",
  "REJECTED",
  "SUSPENDED",
];
export const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "TRANSFER",
  "MOBILE_MONEY",
  "CHECK",
  "OTHER",
];
export const CASH_OUTFLOW_REASONS: CashOutflowReason[] = [
  "DEPENSE",
  "VERSEMENT",
  "ACHAT",
  "ECART",
  "AUTRE",
];
