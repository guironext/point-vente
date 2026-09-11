import { SupplierForm } from "@/components/forms";
import { Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";

type SupplierRow = {
  id: string;
  name: string;
  contact: string;
  address: string;
  _count: { purchaseOrders: number };
};

export default async function SuppliersPage() {
  await requireRoles(["ADMIN", "GERANT"]);
  const suppliers = (await prisma.supplier.findMany({
    include: { _count: { select: { purchaseOrders: true, invoices: true } } },
    orderBy: { name: "asc" },
  })) as SupplierRow[];

  return (
    <div>
      <PageHeader
        eyebrow="Achats"
        title="Fournisseurs"
        description="Carnet des fournisseurs auprès desquels le gérant passe commande."
      />
      <Card className="mb-6">
        <h2 className="display mb-4 text-xl text-brand">Nouveau fournisseur</h2>
        <SupplierForm />
      </Card>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Nom</Th>
              <Th>Contact</Th>
              <Th>Adresse</Th>
              <Th>Commandes</Th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <Td className="font-semibold">{supplier.name}</Td>
                <Td>{supplier.contact}</Td>
                <Td>{supplier.address || "—"}</Td>
                <Td>{supplier._count.purchaseOrders}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
