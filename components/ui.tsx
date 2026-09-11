import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-copper">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="display text-2xl font-semibold tracking-tight text-brand sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-paper p-4 shadow-[0_12px_40px_-28px_rgba(20,53,44,0.5)] sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-stone-700"
    >
      {children}
    </label>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10",
        className,
      )}
      {...props}
    />
  );
}

const buttonVariants = {
  primary: "bg-copper text-white hover:bg-[#a84b1d]",
  secondary: "bg-brand text-white hover:bg-brand-2",
  ghost: "bg-white text-brand border border-line hover:bg-background",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

export function buttonClass(
  variant: keyof typeof buttonVariants = "primary",
  className?: string,
) {
  return cn(
    "inline-flex h-11 min-h-11 w-full touch-manipulation items-center justify-center rounded-xl px-4 text-sm font-semibold transition sm:w-auto disabled:cursor-not-allowed disabled:opacity-60",
    buttonVariants[variant],
    className,
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
}) {
  return (
    <button className={buttonClass(variant, className)} {...props}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-stone-100 text-stone-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-sky-100 text-sky-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}

export function FieldSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      {message}
    </p>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center sm:px-6 sm:py-12">
      <p className="display text-xl text-brand">{title}</p>
      <p className="mt-2 text-sm text-stone-500">{description}</p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  alert = false,
}: {
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          alert ? "bg-copper" : "bg-brand",
        )}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
        {label}
      </p>
      <p className="display mt-2 text-[1.7rem] leading-none text-brand sm:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-stone-500 sm:text-sm">{hint}</p> : null}
    </Card>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto overscroll-x-contain">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="border-b border-line px-3 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("border-b border-line px-3 py-3 align-middle", className)}>
      {children}
    </td>
  );
}
