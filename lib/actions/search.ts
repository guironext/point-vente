"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { roleLabels } from "@/lib/labels";
import { canManageTeam, canPurchase } from "@/lib/permissions";
import { ordersSuffix, pathFor } from "@/lib/session";
import { fullName } from "@/lib/utils";

export type SearchHit = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  group: string;
};

export async function searchApp(query: string): Promise<SearchHit[]> {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const contains = { contains: q };
  const role = user.role;
  const results: SearchHit[] = [];

  const [products, orders] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [{ name: contains }, { brand: contains }, { volume: contains }],
      },
      take: 6,
      orderBy: { name: "asc" },
    }),
    prisma.customerOrder.findMany({
      where: {
        OR: [
          { reference: contains },
          { customerName: contains },
          { customerContact: contains },
        ],
      },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  for (const product of products) {
    results.push({
      id: `product-${product.id}`,
      href:
        role === "VENDEUR"
          ? pathFor(role, "/stock")
          : pathFor(role, `/produits/${product.id}`),
      title: `${product.brand} ${product.name}`,
      subtitle: product.volume,
      group: "Boissons",
    });
  }

  for (const order of orders) {
    results.push({
      id: `order-${order.id}`,
      href: pathFor(role, `${ordersSuffix(role)}/${order.id}`),
      title: order.reference,
      subtitle: order.customerName,
      group: "Commandes",
    });
  }

  if (canPurchase(role)) {
    const [suppliers, purchases] = await Promise.all([
      prisma.supplier.findMany({
        where: {
          OR: [{ name: contains }, { contact: contains }, { address: contains }],
        },
        take: 4,
        orderBy: { name: "asc" },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          OR: [{ reference: contains }, { notes: contains }],
        },
        include: { supplier: true },
        take: 4,
        orderBy: { orderedAt: "desc" },
      }),
    ]);

    for (const supplier of suppliers) {
      results.push({
        id: `supplier-${supplier.id}`,
        href: pathFor(role, "/fournisseurs"),
        title: supplier.name,
        subtitle: supplier.contact,
        group: "Fournisseurs",
      });
    }

    for (const purchase of purchases) {
      results.push({
        id: `purchase-${purchase.id}`,
        href: pathFor(role, `/achats/${purchase.id}`),
        title: purchase.reference,
        subtitle: purchase.supplier.name,
        group: "Achats",
      });
    }
  }

  if (canManageTeam(role)) {
    const members = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: contains },
          { lastName: contains },
          { email: contains },
          { phone: contains },
          { city: contains },
        ],
      },
      take: 4,
      orderBy: { lastName: "asc" },
    });

    for (const member of members) {
      results.push({
        id: `member-${member.id}`,
        href: pathFor(role, "/equipe"),
        title: fullName(member),
        subtitle: `${roleLabels[member.role]} · ${member.email}`,
        group: "Équipe",
      });
    }
  }

  return results;
}
