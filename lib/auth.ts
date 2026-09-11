import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/types";
import { SESSION_COOKIE, ROLE_COOKIE } from "@/lib/constants";
import { sessionBase } from "@/lib/session";

const SESSION_DAYS = 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createToken() {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string, role: Role) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      token: hashToken(token),
      userId,
      expiresAt,
    },
  });
  const jar = await cookies();
  const cookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
  jar.set(SESSION_COOKIE, token, cookie);
  jar.set(ROLE_COOKIE, role, cookie);
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(ROLE_COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requireActiveUser() {
  const user = await requireUser();
  if (user.status === "PENDING_VALIDATION") redirect("/onboarding");
  if (user.status !== "ACTIVE") {
    await destroySession();
    redirect("/connexion");
  }
  return user;
}

export async function requireRoles(roles: Role[]) {
  const user = await requireActiveUser();
  if (user.role === "ADMIN" || roles.includes(user.role)) return user;
  redirect(sessionBase(user.role));
}

export async function requireSessionRole(role: Role) {
  const user = await requireActiveUser();
  if (user.role !== role) redirect(sessionBase(user.role));
  return user;
}

export async function writeAudit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  details = "",
) {
  await prisma.auditLog.create({
    data: { actorId, action, entity, entityId, details },
  });
}
