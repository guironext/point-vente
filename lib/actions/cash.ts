"use server";

import { CASH_OUTFLOW_REASONS, PAYMENT_METHODS } from "@/lib/types";
import type { CashOutflowReason, PaymentMethod } from "@/lib/types";
import { prisma } from "@/lib/db";
import { requireActiveUser, writeAudit } from "@/lib/auth";
import { revalidateSession } from "@/lib/revalidate";
import type { ActionState } from "@/lib/actions/auth";

export async function createCashOutflowAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActiveUser();
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "") as CashOutflowReason;
  const method = String(formData.get("method") ?? "CASH") as PaymentMethod;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Indiquez un montant de sortie." };
  }
  if (!CASH_OUTFLOW_REASONS.includes(reason)) {
    return { error: "Choisissez le motif de la sortie." };
  }
  if (!PAYMENT_METHODS.includes(method)) {
    return { error: "Mode de paiement invalide." };
  }

  const outflow = await prisma.cashOutflow.create({
    data: {
      amount: Math.round(amount),
      reason,
      method,
      notes,
      createdById: user.id,
    },
  });
  await writeAudit(user.id, "cash_outflow", "CashOutflow", outflow.id);
  revalidateSession("/comptabilite");
  return { success: "Sortie d'argent enregistrée." };
}
