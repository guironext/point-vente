import { revalidatePath } from "next/cache";
import { allSessionPaths } from "@/lib/session";

export function revalidateSession(suffix: string) {
  for (const path of allSessionPaths(suffix)) {
    revalidatePath(path);
  }
  if (suffix === "/ventes" || suffix.startsWith("/ventes/")) {
    revalidatePath(`/admin/commandes${suffix.slice("/ventes".length)}`);
  }
}
