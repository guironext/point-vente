import { CreateFactureButton } from "@/components/facture-form";
import { FactureTabs, type FactureTabItem } from "@/components/facture-tabs";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pathFor } from "@/lib/session";
import type { CustomerOrderStatus, PackagingType } from "@/lib/types";

type FactureRecord = {
  id: string;
  reference: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  notes: string;
  createdAt: Date;
  status: CustomerOrderStatus;
  lines: {
    id: string;
    quantityPacks: number;
    unitPrice: number;
    product: { brand: string; name: string; volume: string };
    packaging: { type: PackagingType; unitsPerPack: number };
  }[];
  payments: { amount: number }[];
};

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireRoles(["ADMIN", "GERANT", "VENDEUR"]);
  const { tab } = await searchParams;
  const orders = (await prisma.customerOrder.findMany({
    where: { reference: { startsWith: "FAC-" } },
    include: {
      lines: { include: { product: true, packaging: true } },
      payments: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })) as FactureRecord[];
  const deducted = await prisma.stockMovement.findMany({
    where: {
      type: "OUT",
      referenceId: { in: orders.map((order) => order.id) },
    },
    select: { referenceId: true },
    distinct: ["referenceId"],
  });
  const deductedIds = new Set(deducted.map((row) => row.referenceId));

  const factures: FactureTabItem[] = orders.map((order) => ({
    id: order.id,
    reference: order.reference,
    customerName: order.customerName,
    customerContact: order.customerContact,
    customerAddress: order.customerAddress,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    printHref: pathFor(user.role, `/factures/${order.id}/imprimer`),
    editHref: pathFor(user.role, `/factures/${order.id}`),
    lines: order.lines,
    payments: order.payments,
    needsStock:
      order.lines.length > 0 &&
      order.status !== "CANCELLED" &&
      !deductedIds.has(order.id),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Vente"
        title="Factures"
        description="Toutes les factures client, onglet par onglet. La TVA est à 18 %."
        actions={<CreateFactureButton />}
      />
      {factures.length === 0 ? (
        <Card>
          <EmptyState
            title="Aucune facture"
            description="Utilisez « Créer une facture » pour ouvrir une nouvelle pièce avec son numéro."
          />
        </Card>
      ) : (
        <FactureTabs factures={factures} initialTab={Number(tab ?? "1")} />
      )}
    </div>
  );
}
