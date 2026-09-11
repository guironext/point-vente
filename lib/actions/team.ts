"use server";

import bcrypt from "bcryptjs";
import { ROLES, USER_STATUSES, type Role, type UserStatus } from "@/lib/types";
import { prisma } from "@/lib/db";
import { createToken, requireRoles, writeAudit } from "@/lib/auth";
import { revalidateSession } from "@/lib/revalidate";
import type { ActionState } from "@/lib/actions/auth";

export async function inviteUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRoles(["ADMIN"]);
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "") as Role;
  if (!email || !email.includes("@")) return { error: "Email invalide." };
  if (!ROLES.includes(role)) return { error: "Rôle invalide." };

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { error: "Un compte existe déjà pour cet email." };

  await prisma.invitation.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date() },
  });

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role,
      token: createToken(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
    },
  });
  await writeAudit(admin.id, "invite", "Invitation", invitation.id, email);
  revalidateSession("/equipe");
  return { success: "Invitation créée. Copiez le lien pour l'envoyer." };
}

export async function validateUserAction(formData: FormData) {
  const admin = await requireRoles(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "PENDING_VALIDATION") return;
  if (user.id === admin.id) return;

  await prisma.user.update({
    where: { id: userId },
    data: { status: decision === "reject" ? "REJECTED" : "ACTIVE" },
  });
  await writeAudit(
    admin.id,
    decision === "reject" ? "reject_user" : "validate_user",
    "User",
    userId,
  );
  revalidateSession("/equipe");
}

export async function updateUserStatusAction(formData: FormData) {
  const admin = await requireRoles(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (userId === admin.id) return;
  if (status !== "ACTIVE" && status !== "SUSPENDED") return;
  await prisma.user.update({ where: { id: userId }, data: { status } });
  await writeAudit(admin.id, "update_status", "User", userId, status);
  revalidateSession("/equipe");
}

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRoles(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const lastName = String(formData.get("lastName") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const emergencyContact = String(formData.get("emergencyContact") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const status = String(formData.get("status") ?? "") as UserStatus;
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Compte introuvable." };

  if (!lastName || !firstName || !phone || !emergencyContact || !city) {
    return { error: "Tous les champs du profil sont obligatoires." };
  }
  if (!email || !email.includes("@")) return { error: "Email invalide." };
  if (!ROLES.includes(role)) return { error: "Rôle invalide." };
  if (!USER_STATUSES.includes(status)) return { error: "Statut invalide." };

  if (userId === admin.id && role !== user.role) {
    return { error: "Vous ne pouvez pas modifier votre propre rôle." };
  }
  if (userId === admin.id && status !== user.status) {
    return { error: "Vous ne pouvez pas modifier votre propre statut." };
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
  });
  if (emailTaken) return { error: "Un autre compte utilise déjà cet email." };

  if (password) {
    if (password.length < 8) {
      return { error: "Le mot de passe doit contenir au moins 8 caractères." };
    }
    if (password !== confirm) {
      return { error: "Les mots de passe ne correspondent pas." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastName,
      firstName,
      email,
      phone,
      emergencyContact,
      city,
      role,
      status,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    },
  });
  await writeAudit(admin.id, "update_user", "User", userId, email);
  revalidateSession("/equipe");
  return { success: "Compte mis à jour." };
}
