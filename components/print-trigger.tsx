"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui";

export function PrintTrigger() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonClass("primary", "h-9 min-h-9 px-3 text-xs print:hidden")}
    >
      <Printer className="mr-1.5 h-3.5 w-3.5" />
      Imprimer
    </button>
  );
}
