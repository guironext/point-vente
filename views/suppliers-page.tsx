import {
  SuppliersWorkspace,
  type SupplierCard,
} from "@/components/suppliers-workspace";
import { PageHeader, StatCard } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";

type SupplierRecord = {
  id: string;
  name: string;
  contact: string;
  address: string;
  notes: string;
  active: boolean;
  _count: { purchaseOrders: number; invoices: number };
};

export default async function SuppliersPage() {
  await requireRoles(["ADMIN", "GERANT"]);
  const rows = (await prisma.supplier.findMany({
    include: { _count: { select: { purchaseOrders: true, invoices: true } } },
    orderBy: { name: "asc" },
  })) as SupplierRecord[];

  const suppliers: SupplierCard[] = rows.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    contact: supplier.contact,
    address: supplier.address,
    notes: supplier.notes,
    active: supplier.active,
    orders: supplier._count.purchaseOrders,
    invoices: supplier._count.invoices,
  }));

  const active = suppliers.filter((supplier) => supplier.active).length;
  const orders = suppliers.reduce((sum, supplier) => sum + supplier.orders, 0);
  const invoices = suppliers.reduce((sum, supplier) => sum + supplier.invoices, 0);

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow="Achats"
        title="Fournisseurs"
        description="Carnet des fournisseurs auprès desquels le gérant passe commande."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Fournisseurs" value={String(suppliers.length)} />
        <StatCard label="Actifs" value={String(active)} />
        <StatCard
          label="Commandes"
          value={String(orders)}
          hint="Tous les fournisseurs"
        />
        <StatCard
          label="Factures"
          value={String(invoices)}
          hint="Pièces enregistrées"
        />
      </div>

      <SuppliersWorkspace suppliers={suppliers} />
    </div>
  );
}
