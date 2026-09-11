"use client";

import { useActionState, useState } from "react";
import { loginAction, signupAction } from "@/lib/actions/auth";
import { createInvoiceAction, createPaymentReceiptAction } from "@/lib/actions/invoices";
import { createProductAction, createSupplierAction } from "@/lib/actions/catalog";
import { createPurchaseOrderAction, receivePurchaseAction } from "@/lib/actions/purchases";
import { addCustomerPaymentAction, createSaleAction, deliverSaleAction } from "@/lib/actions/sales";
import { adjustStockAction } from "@/lib/actions/stock";
import { inviteUserAction } from "@/lib/actions/team";
import {
  Button,
  FieldError,
  FieldSuccess,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { packagingLabels, paymentMethodLabels, roleLabels } from "@/lib/labels";
import type { PackagingType, Role } from "@/lib/types";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FieldError message={state?.error} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Entrer dans la session"}
      </Button>
    </form>
  );
}

export function SignupForm({
  token,
  email,
  role,
}: {
  token: string;
  email: string;
  role: Role;
}) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FieldError message={state?.error} />
      <p className="rounded-xl bg-brand/5 px-3 py-2 text-sm text-brand">
        Invitation pour <strong>{email}</strong> — rôle {roleLabels[role]}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" name="lastName" required />
        </div>
        <div>
          <Label htmlFor="firstName">Prénoms</Label>
          <Input id="firstName" name="firstName" required />
        </div>
      </div>
      <div>
        <Label htmlFor="phone">Contact</Label>
        <Input id="phone" name="phone" required />
      </div>
      <div>
        <Label htmlFor="emergencyContact">Personne à contacter en cas d&apos;urgence</Label>
        <Input id="emergencyContact" name="emergencyContact" required />
      </div>
      <div>
        <Label htmlFor="city">Ville ou quartier d&apos;habitation</Label>
        <Input id="city" name="city" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <div>
          <Label htmlFor="confirm">Confirmation</Label>
          <Input id="confirm" name="confirm" type="password" minLength={8} required />
        </div>
      </div>
      <Button className="w-full" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteUserAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_auto] lg:items-end">
        <div>
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="email@exemple.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="invite-role">Rôle</Label>
          <Select id="invite-role" name="role" defaultValue="VENDEUR">
            <option value="GERANT">Gérant</option>
            <option value="VENDEUR">Vendeur</option>
            <option value="ADMIN">Administrateur</option>
          </Select>
        </div>
        <Button disabled={pending}>{pending ? "Envoi…" : "Inviter"}</Button>
      </div>
    </form>
  );
}

type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  packagings: { id: string; type: PackagingType; unitsPerPack: number }[];
};

export function LineEditor({
  products,
  name = "lines",
}: {
  products: CatalogProduct[];
  name?: string;
}) {
  const [lines, setLines] = useState([
    { productId: products[0]?.id ?? "", packagingId: products[0]?.packagings[0]?.id ?? "", packs: 1 },
  ]);

  function packagingsFor(productId: string) {
    return products.find((p) => p.id === productId)?.packagings ?? [];
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(lines)} />
      {lines.map((line, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]">
          <Select
            value={line.productId}
            onChange={(e) => {
              const productId = e.target.value;
              const firstPack = packagingsFor(productId)[0]?.id ?? "";
              setLines((current) =>
                current.map((item, i) =>
                  i === index ? { ...item, productId, packagingId: firstPack } : item,
                ),
              );
            }}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.brand} {product.name}
              </option>
            ))}
          </Select>
          <Select
            value={line.packagingId}
            onChange={(e) =>
              setLines((current) =>
                current.map((item, i) =>
                  i === index ? { ...item, packagingId: e.target.value } : item,
                ),
              )
            }
          >
            {packagingsFor(line.productId).map((pack) => (
              <option key={pack.id} value={pack.id}>
                {packagingLabels[pack.type]} · {pack.unitsPerPack} u.
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min={1}
            value={line.packs}
            onChange={(e) =>
              setLines((current) =>
                current.map((item, i) =>
                  i === index ? { ...item, packs: Number(e.target.value) } : item,
                ),
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
            disabled={lines.length === 1}
          >
            Retirer
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        onClick={() =>
          setLines((current) => [
            ...current,
            {
              productId: products[0]?.id ?? "",
              packagingId: products[0]?.packagings[0]?.id ?? "",
              packs: 1,
            },
          ])
        }
      >
        Ajouter une ligne
      </Button>
    </div>
  );
}

export function ProductForm() {
  const [state, action, pending] = useActionState(createProductAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Nom</Label>
          <Input name="name" required placeholder="Castel Beer" />
        </div>
        <div>
          <Label>Marque</Label>
          <Input name="brand" required placeholder="Castel" />
        </div>
        <div>
          <Label>Volume</Label>
          <Input name="volume" required placeholder="65 cl" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Prix d&apos;achat / unité (F)</Label>
          <Input name="unitPurchasePrice" type="number" min={1} required />
        </div>
        <div>
          <Label>Prix de vente / unité (F)</Label>
          <Input name="unitSalePrice" type="number" min={1} required />
        </div>
        <div>
          <Label>Seuil d&apos;alerte (unités)</Label>
          <Input name="lowStockThreshold" type="number" min={0} defaultValue={24} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Unités par casier</Label>
          <Input name="casierUnits" type="number" min={0} placeholder="12" />
        </div>
        <div>
          <Label>Unités par carton</Label>
          <Input name="cartonUnits" type="number" min={0} placeholder="24" />
        </div>
      </div>
      <Button disabled={pending}>{pending ? "Enregistrement…" : "Ajouter la boisson"}</Button>
    </form>
  );
}

export function SupplierForm() {
  const [state, action, pending] = useActionState(createSupplierAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Nom</Label>
          <Input name="name" required />
        </div>
        <div>
          <Label>Contact</Label>
          <Input name="contact" required />
        </div>
      </div>
      <div>
        <Label>Adresse</Label>
        <Input name="address" />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea name="notes" />
      </div>
      <Button disabled={pending}>Enregistrer le fournisseur</Button>
    </form>
  );
}

export function PurchaseForm({
  suppliers,
  products,
  returnTo,
}: {
  suppliers: { id: string; name: string }[];
  products: CatalogProduct[];
  returnTo?: "commandes" | "achats";
}) {
  const [state, action, pending] = useActionState(createPurchaseOrderAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <FieldError message={state?.error} />
      <div>
        <Label>Fournisseur</Label>
        <Select name="supplierId" required defaultValue={suppliers[0]?.id}>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Lignes (casiers / cartons)</Label>
        <LineEditor products={products} />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea name="notes" />
      </div>
      <Button disabled={pending}>Créer la commande</Button>
    </form>
  );
}

export function ReceiveForm({
  orderId,
  lines,
}: {
  orderId: string;
  lines: { id: string; label: string; ordered: number; already: number }[];
}) {
  const [state, action, pending] = useActionState(receivePurchaseAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />
      {lines.map((line) => (
        <div key={line.id} className="grid items-end gap-2 sm:grid-cols-[1fr_140px]">
          <p className="text-sm">
            {line.label}
            <span className="block text-xs text-stone-500">
              Commandé {line.ordered} · déjà reçu {line.already}
            </span>
          </p>
          <div>
            <Label>Qté reçue</Label>
            <Input
              name={`recv_${line.id}`}
              type="number"
              min={0}
              max={Math.max(line.ordered - line.already, 0)}
              defaultValue={Math.max(line.ordered - line.already, 0)}
            />
          </div>
        </div>
      ))}
      <Textarea name="notes" placeholder="Commentaire de réception" />
      <Button disabled={pending}>Enregistrer la réception</Button>
    </form>
  );
}

export function InvoiceForm({
  suppliers,
  orders,
}: {
  suppliers: { id: string; name: string }[];
  orders: { id: string; reference: string }[];
}) {
  const [state, action, pending] = useActionState(createInvoiceAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>N° facture</Label>
          <Input name="number" required />
        </div>
        <div>
          <Label>Date</Label>
          <Input name="issuedAt" type="date" required />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Fournisseur</Label>
          <Select name="supplierId" required>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Commande liée (optionnel)</Label>
          <Select name="purchaseOrderId" defaultValue="">
            <option value="">Aucune</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.reference}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label>Montant (F)</Label>
        <Input name="amount" type="number" min={1} required />
      </div>
      <Textarea name="notes" placeholder="Notes" />
      <Button disabled={pending}>Enregistrer la facture</Button>
    </form>
  );
}

export function PaymentReceiptForm({
  invoiceId,
  remaining,
}: {
  invoiceId: string;
  remaining: number;
}) {
  const [state, action, pending] = useActionState(createPaymentReceiptAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Input name="amount" type="number" min={1} max={remaining} placeholder="Montant" required />
        <Select name="method" defaultValue="CASH">
          {Object.entries(paymentMethodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input name="paidAt" type="date" />
        <Button disabled={pending}>Reçu</Button>
      </div>
    </form>
  );
}

export function SaleForm({ products }: { products: CatalogProduct[] }) {
  const [state, action, pending] = useActionState(createSaleAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FieldError message={state?.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Nom du client</Label>
          <Input name="customerName" required />
        </div>
        <div>
          <Label>Contact</Label>
          <Input name="customerContact" required />
        </div>
      </div>
      <div>
        <Label>Adresse / quartier</Label>
        <Input name="customerAddress" />
      </div>
      <div>
        <Label>Boissons</Label>
        <LineEditor products={products} />
      </div>
      <Textarea name="notes" placeholder="Notes de commande" />
      <Button disabled={pending}>Enregistrer la commande</Button>
    </form>
  );
}

export function DeliverForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(deliverSaleAction, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={orderId} />
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />
      <Button disabled={pending}>Confirmer la livraison</Button>
    </form>
  );
}

export function CustomerPaymentForm({
  orderId,
  remaining,
}: {
  orderId: string;
  remaining: number;
}) {
  const [state, action, pending] = useActionState(addCustomerPaymentAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          name="amount"
          type="number"
          min={1}
          max={remaining}
          defaultValue={remaining}
          required
        />
        <Select name="method" defaultValue="CASH">
          {Object.entries(paymentMethodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button disabled={pending}>Encaisser</Button>
      </div>
    </form>
  );
}

export function AdjustStockForm({
  products,
}: {
  products: { id: string; name: string; brand: string }[];
}) {
  const [state, action, pending] = useActionState(adjustStockAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_1fr_auto]">
        <Select name="productId" required>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.brand} {product.name}
            </option>
          ))}
        </Select>
        <Input name="quantityUnits" type="number" placeholder="+/- unités" required />
        <Input name="notes" placeholder="Motif" />
        <Button disabled={pending}>Ajuster</Button>
      </div>
    </form>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex h-11 min-h-11 w-full items-center justify-center rounded-xl border border-line bg-white px-3 text-xs font-semibold text-brand transition hover:bg-background sm:h-9 sm:min-h-9 sm:w-auto"
    >
      {copied ? "Copié" : "Copier le lien"}
    </button>
  );
}
