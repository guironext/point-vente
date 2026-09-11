"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  requireUser,
  writeAudit,
} from "@/lib/auth";
import { sessionBase } from "@/lib/session";

export type ActionState = { error?: string; success?: string } | undefined;

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email et mot de passe requis." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Identifiants incorrects." };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Identifiants incorrects." };

  if (user.status === "REJECTED") {
    return { error: "Ce compte a été refusé par l'administrateur." };
  }
  if (user.status === "SUSPENDED") {
    return { error: "Ce compte est suspendu. Contactez l'administrateur." };
  }

  await createSession(user.id, user.role);
  if (user.status === "PENDING_VALIDATION") redirect("/onboarding");
  redirect(sessionBase(user.role));
}

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation || invitation.usedAt) {
    return { error: "Invitation invalide ou déjà utilisée." };
  }
  if (invitation.expiresAt < new Date()) {
    return { error: "Cette invitation a expiré. Demandez-en une nouvelle." };
  }

  const lastName = String(formData.get("lastName") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const emergencyContact = String(formData.get("emergencyContact") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!lastName || !firstName || !phone || !emergencyContact || !city) {
    return { error: "Tous les champs du profil sont obligatoires." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  if (password !== confirm) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: invitation.email },
  });
  if (existing) return { error: "Un compte existe déjà pour cet email." };

  const user = await prisma.user.create({
    data: {
      email: invitation.email,
      passwordHash: await bcrypt.hash(password, 12),
      lastName,
      firstName,
      phone,
      emergencyContact,
      city,
      role: invitation.role,
      status: "PENDING_VALIDATION",
    },
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { usedAt: new Date() },
  });
  await writeAudit(
    invitation.createdById,
    "signup",
    "User",
    user.id,
    user.email,
  );
  await createSession(user.id, user.role);
  redirect("/onboarding");
}

export async function logoutAction() {
  await destroySession();
  redirect("/connexion");
}

export async function refreshOnboarding() {
  const user = await requireUser();
  if (user.status === "ACTIVE") redirect(sessionBase(user.role));
  if (user.status !== "PENDING_VALIDATION") {
    await destroySession();
    redirect("/connexion");
  }
}
