"use server";

import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";
import { prisma } from "@/lib/db";
import { requireRoles, writeAudit } from "@/lib/auth";
import { revalidateSession } from "@/lib/revalidate";
import type { ActionState } from "@/lib/actions/auth";

export async function createInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRoles(["ADMIN", "GERANT"]);
  const number = String(formData.get("number") ?? "").trim();
  const supplierId = String(formData.get("supplierId") ?? "");
  const amount = Number(formData.get("amount"));
  const issuedAt = String(formData.get("issuedAt") ?? "");
  if (!number || !supplierId || !amount || !issuedAt) {
    return { error: "Numéro, fournisseur, date et montant sont requis." };
  }
  const purchaseOrderId = String(formData.get("purchaseOrderId") ?? "") || null;
  const invoice = await prisma.supplierInvoice.create({
    data: {
      number,
      supplierId,
      purchaseOrderId,
      amount,
      issuedAt: new Date(issuedAt),
      notes: String(formData.get("notes") ?? "").trim(),
      createdById: user.id,
    },
  });
  await writeAudit(user.id, "create_invoice", "SupplierInvoice", invoice.id);
  revalidateSession("/factures");
  return { success: "Facture enregistrée." };
}

export async function createPaymentReceiptAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRoles(["ADMIN", "GERANT"]);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") ?? "") as PaymentMethod;
  if (!invoiceId || !amount) return { error: "Facture et montant requis." };
  if (!PAYMENT_METHODS.includes(method)) return { error: "Mode de paiement invalide." };

  const invoice = await prisma.supplierInvoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) return { error: "Facture introuvable." };
  const alreadyPaid = invoice.payments.reduce(
    (sum: number, payment: { amount: number }) => sum + payment.amount,
    0,
  );
  if (alreadyPaid + amount > invoice.amount) {
    return { error: "Le montant dépasse le reste à payer." };
  }

  const receipt = await prisma.paymentReceipt.create({
    data: {
      invoiceId,
      amount,
      method,
      notes: String(formData.get("notes") ?? "").trim(),
      createdById: user.id,
      paidAt: new Date(String(formData.get("paidAt") || Date.now())),
    },
  });
  await writeAudit(user.id, "payment_receipt", "PaymentReceipt", receipt.id);
  revalidateSession("/factures");
  return { success: "Reçu de paiement enregistré." };
}
