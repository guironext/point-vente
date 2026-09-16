"use client";

import { useActionState } from "react";
import { createCashOutflowAction } from "@/lib/actions/cash";
import {
  Button,
  FieldError,
  FieldSuccess,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { cashOutflowReasonLabels, paymentMethodLabels } from "@/lib/labels";
import { CASH_OUTFLOW_REASONS } from "@/lib/types";

export function CashOutflowForm() {
  const [state, action, pending] = useActionState(
    createCashOutflowAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <FieldError message={state?.error} />
      <FieldSuccess message={state?.success} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="amount">Montant (F)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={1}
            step={1}
            required
            placeholder="5000"
          />
        </div>
        <div>
          <Label htmlFor="reason">Motif</Label>
          <Select id="reason" name="reason" defaultValue="DEPENSE" required>
            {CASH_OUTFLOW_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {cashOutflowReasonLabels[reason]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="method">Prélevé depuis</Label>
        <Select id="method" name="method" defaultValue="CASH">
          {Object.entries(paymentMethodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="notes">Note (optionnel)</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Ex. transport, versement au gérant…"
        />
      </div>
      <Button disabled={pending}>Enregistrer la sortie</Button>
    </form>
  );
}
