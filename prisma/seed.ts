import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@pointvente.local" },
    update: {},
    create: {
      email: "admin@pointvente.local",
      passwordHash,
      lastName: "Kouassi",
      firstName: "Awa",
      phone: "+225 07 00 00 00 01",
      emergencyContact: "Koffi Kouassi — +225 07 00 00 00 02",
      city: "Abidjan, Cocody",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const soda = await prisma.supplier.upsert({
    where: { id: "seed-supplier-1" },
    update: {},
    create: {
      id: "seed-supplier-1",
      name: "SODIBO Distribution",
      contact: "+225 27 22 00 11 22",
      address: "Zone industrielle Yopougon",
      notes: "Livraison casiers et cartons, 48h",
    },
  });

  const products = [
    {
      id: "seed-castel",
      name: "Castel Beer",
      brand: "Castel",
      volume: "65 cl",
      unitPurchasePrice: 450,
      unitSalePrice: 600,
      lowStockThreshold: 48,
      packagings: [
        { type: "CASIER" as const, unitsPerPack: 12 },
        { type: "CARTON" as const, unitsPerPack: 24 },
      ],
    },
    {
      id: "seed-guinness",
      name: "Guinness Foreign Extra",
      brand: "Guinness",
      volume: "60 cl",
      unitPurchasePrice: 700,
      unitSalePrice: 900,
      lowStockThreshold: 24,
      packagings: [{ type: "CASIER" as const, unitsPerPack: 12 }],
    },
    {
      id: "seed-coca",
      name: "Coca-Cola",
      brand: "Coca-Cola",
      volume: "33 cl",
      unitPurchasePrice: 250,
      unitSalePrice: 350,
      lowStockThreshold: 48,
      packagings: [{ type: "CARTON" as const, unitsPerPack: 24 }],
    },
    {
      id: "seed-eau",
      name: "Eau minérale",
      brand: "Awa",
      volume: "1,5 L",
      unitPurchasePrice: 200,
      unitSalePrice: 300,
      lowStockThreshold: 24,
      packagings: [{ type: "CARTON" as const, unitsPerPack: 6 }],
    },
  ];

  for (const item of products) {
    await prisma.product.upsert({
      where: { id: item.id },
      update: { supplierId: soda.id },
      create: {
        id: item.id,
        name: item.name,
        brand: item.brand,
        volume: item.volume,
        unitPurchasePrice: item.unitPurchasePrice,
        unitSalePrice: item.unitSalePrice,
        lowStockThreshold: item.lowStockThreshold,
        supplierId: soda.id,
        packagings: { create: item.packagings },
      },
    });
  }

  const existingPo = await prisma.purchaseOrder.findUnique({
    where: { reference: "ACH-0001" },
  });

  if (!existingPo) {
    const castel = await prisma.product.findUniqueOrThrow({
      where: { id: "seed-castel" },
      include: { packagings: true },
    });
    const coca = await prisma.product.findUniqueOrThrow({
      where: { id: "seed-coca" },
      include: { packagings: true },
    });
    const casier = castel.packagings.find((p) => p.type === "CASIER")!;
    const carton = coca.packagings.find((p) => p.type === "CARTON")!;

    const order = await prisma.purchaseOrder.create({
      data: {
        reference: "ACH-0001",
        supplierId: soda.id,
        createdById: admin.id,
        status: "RECEIVED",
        notes: "Commande initiale de mise en stock",
        lines: {
          create: [
            {
              productId: castel.id,
              packagingId: casier.id,
              quantityPacks: 20,
            },
            {
              productId: coca.id,
              packagingId: carton.id,
              quantityPacks: 10,
            },
          ],
        },
      },
    });

    const receipt = await prisma.goodsReceipt.create({
      data: {
        orderId: order.id,
        receivedById: admin.id,
        notes: "Réception complète",
        lines: {
          create: [
            {
              productId: castel.id,
              packagingId: casier.id,
              quantityPacks: 20,
            },
            {
              productId: coca.id,
              packagingId: carton.id,
              quantityPacks: 10,
            },
          ],
        },
      },
    });

    await prisma.stockMovement.createMany({
      data: [
        {
          productId: castel.id,
          quantityUnits: 20 * 12,
          type: "IN",
          referenceType: "goods_receipt",
          referenceId: receipt.id,
          createdById: admin.id,
          notes: "Réception ACH-0001",
        },
        {
          productId: coca.id,
          quantityUnits: 10 * 24,
          type: "IN",
          referenceType: "goods_receipt",
          referenceId: receipt.id,
          createdById: admin.id,
          notes: "Réception ACH-0001",
        },
      ],
    });

    await prisma.supplierInvoice.create({
      data: {
        number: "F-2026-001",
        supplierId: soda.id,
        purchaseOrderId: order.id,
        issuedAt: new Date(),
        amount: 20 * 12 * 450 + 10 * 24 * 250,
        createdById: admin.id,
        notes: "Facture de la commande initiale",
      },
    });
  }

  console.log("Seed OK — admin@pointvente.local / Admin1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
