import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sessionBase } from "@/lib/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (user.status === "PENDING_VALIDATION") redirect("/onboarding");
  redirect(sessionBase(user.role));
}
