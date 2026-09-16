"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Printer } from "lucide-react";
import {
  markFacturePaidAction,
  markFactureUnpaidAction,
} from "@/lib/actions/sales";
import { Button, FieldError, FieldSuccess, buttonClass } from "@/components/ui";

const compact = "h-9 min-h-9 px-3 text-xs sm:w-auto";

function PaidSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      variant="secondary"
      className={compact}
      disabled={disabled || pending}
    >
      {pending ? "…" : "Payé"}
    </Button>
  );
}

function UnpaidSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button variant="danger" className={compact} disabled={disabled || pending}>
      {pending ? "…" : "Impayer"}
    </Button>
  );
}

export function FactureActions({
  orderId,
  printHref,
  remaining,
  paid,
  needsStock = false,
}: {
  orderId: string;
  printHref: string;
  remaining: number;
  paid: number;
  needsStock?: boolean;
}) {
  const [paidState, paidAction] = useActionState(markFacturePaidAction, undefined);
  const [unpaidState, unpaidAction] = useActionState(
    markFactureUnpaidAction,
    undefined,
  );

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end print:hidden">
      <FieldError message={paidState?.error ?? unpaidState?.error} />
      <FieldSuccess message={paidState?.success ?? unpaidState?.success} />
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap">
        <Link href={printHref} className={buttonClass("ghost", compact)}>
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Imprimer
        </Link>
        <form action={paidAction}>
          <input type="hidden" name="id" value={orderId} />
          <PaidSubmit disabled={remaining <= 0 && !needsStock} />
        </form>
        <form action={unpaidAction}>
          <input type="hidden" name="id" value={orderId} />
          <UnpaidSubmit disabled={paid <= 0} />
        </form>
      </div>
    </div>
  );
}
