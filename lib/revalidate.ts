import { revalidatePath } from "next/cache";
import { allSessionPaths } from "@/lib/session";

export function revalidateSession(suffix: string) {
  for (const path of allSessionPaths(suffix)) {
    revalidatePath(path);
  }
  if (suffix === "/comptabilite" || suffix.startsWith("/ventes")) {
    revalidatePath("/vendeur/comptabilite");
    revalidatePath("/admin/comptabilite");
    revalidatePath("/gerant/comptabilite");
  }
  if (suffix === "/ventes" || suffix.startsWith("/ventes/")) {
    revalidatePath(`/admin/commandes${suffix.slice("/ventes".length)}`);
  }
  if (suffix === "/achats" || suffix.startsWith("/achats/")) {
    revalidatePath(
      `/admin/approvisionnements${suffix.slice("/achats".length)}`,
    );
    revalidatePath(`/vendeur/commandes${suffix.slice("/achats".length)}`);
  }
}
