import { notFound } from "next/navigation";
import { ReceiveForm } from "@/components/forms";
import { Badge, Button, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import {
  cancelPurchaseOrderAction,
  sendPurchaseOrderAction,
} from "@/lib/actions/purchases";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { packagingLabels, purchaseStatusLabels } from "@/lib/labels";
import { canAdjustStock } from "@/lib/permissions";
import { formatDate, fullName } from "@/lib/utils";
import type { PackagingType, PurchaseOrderStatus } from "@/lib/types";

type PurchaseLine = {
  id: string;
  productId: string;
  packagingId: string;
  quantityPacks: number;
  product: { brand: string; name: string };
  packaging: { type: PackagingType; unitsPerPack: number };
};

type PurchaseDetail = {
  id: string;
  reference: string;
  status: PurchaseOrderStatus;
  orderedAt: Date;
  createdById: string;
  supplier: { name: string };
  createdBy: { firstName: string; lastName: string };
  lines: PurchaseLine[];
  receipts: {
    id: string;
    receivedAt: Date;
    receivedBy: { firstName: string; lastName: string };
    lines: {
      id: string;
      productId: string;
      packagingId: string;
      quantityPacks: number;
      product: { name: string };
      packaging: { type: PackagingType; unitsPerPack: number };
    }[];
  }[];
};

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireActiveUser();
  const { id } = await params;
  const found = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdBy: true,
      lines: { include: { product: true, packaging: true } },
      receipts: {
        include: {
          receivedBy: true,
          lines: { include: { product: true, packaging: true } },
        },
        orderBy: { receivedAt: "desc" },
      },
    },
  });
  if (!found) notFound();
  const order = found as PurchaseDetail;

  const received = new Map<string, number>();
  for (const receipt of order.receipts) {
    for (const line of receipt.lines) {
      const key = `${line.productId}:${line.packagingId}`;
      received.set(key, (received.get(key) ?? 0) + line.quantityPacks);
    }
  }

  const canReceive =
    canAdjustStock(user.role) &&
    (order.status === "SENT" || order.status === "PARTIALLY_RECEIVED");

  return (
    <div>
      <PageHeader
        eyebrow={order.reference}
        title={order.supplier.name}
        description={`Créée par ${fullName(order.createdBy)} le ${formatDate(order.orderedAt)}`}
        actions={
          <Badge
            tone={
              order.status === "RECEIVED"
                ? "success"
                : order.status === "CANCELLED"
                  ? "danger"
                  : "warning"
            }
          >
            {purchaseStatusLabels[order.status]}
          </Badge>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {order.status === "DRAFT" ? (
          <form action={sendPurchaseOrderAction}>
            <input type="hidden" name="id" value={order.id} />
            <Button>Marquer comme envoyée</Button>
          </form>
        ) : null}
        {order.status !== "RECEIVED" && order.status !== "CANCELLED" ? (
          <form action={cancelPurchaseOrderAction}>
            <input type="hidden" name="id" value={order.id} />
            <Button variant="danger">Annuler</Button>
          </form>
        ) : null}
      </div>

      <Card className="mb-6">
        <h2 className="display mb-4 text-xl text-brand">Lignes commandées</h2>
        <Table>
          <thead>
            <tr>
              <Th>Boisson</Th>
              <Th>Conditionnement</Th>
              <Th>Qté</Th>
              <Th>Unités</Th>
              <Th>Reçu</Th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => {
              const already =
                received.get(`${line.productId}:${line.packagingId}`) ?? 0;
              return (
                <tr key={line.id}>
                  <Td>
                    {line.product.brand} {line.product.name}
                  </Td>
                  <Td>
                    {packagingLabels[line.packaging.type]} ({line.packaging.unitsPerPack} u.)
                  </Td>
                  <Td>{line.quantityPacks}</Td>
                  <Td>{line.quantityPacks * line.packaging.unitsPerPack}</Td>
                  <Td>{already}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {canReceive ? (
        <Card className="mb-6">
          <h2 className="display mb-4 text-xl text-brand">Réception</h2>
          <ReceiveForm
            orderId={order.id}
            lines={order.lines.map((line) => ({
              id: line.id,
              label: `${line.product.brand} ${line.product.name} · ${packagingLabels[line.packaging.type]}`,
              ordered: line.quantityPacks,
              already: received.get(`${line.productId}:${line.packagingId}`) ?? 0,
            }))}
          />
        </Card>
      ) : null}

      <Card>
        <h2 className="display mb-4 text-xl text-brand">Historique de réception</h2>
        {order.receipts.length === 0 ? (
          <p className="text-sm text-stone-500">Aucune réception pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-4">
            {order.receipts.map((receipt) => (
              <li key={receipt.id} className="rounded-xl border border-line p-4 text-sm">
                <p className="font-semibold">
                  {formatDate(receipt.receivedAt)} — {fullName(receipt.receivedBy)}
                </p>
                <ul className="mt-2 list-disc pl-5 text-stone-600">
                  {receipt.lines.map((line) => (
                    <li key={line.id}>
                      {line.quantityPacks} {packagingLabels[line.packaging.type].toLowerCase()}
                      {line.quantityPacks > 1 ? "s" : ""} de {line.product.name} (
                      {line.quantityPacks * line.packaging.unitsPerPack} u.)
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
