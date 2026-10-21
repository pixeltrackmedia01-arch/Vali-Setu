import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-navy-600 text-white hover:bg-navy-700 disabled:bg-navy-200",
  secondary: "bg-white text-navy-700 border border-navy-200 hover:bg-navy-50 disabled:text-ink-faint",
  ghost: "text-navy-700 hover:bg-navy-50",
  danger: "bg-danger-600 text-white hover:bg-danger-700 disabled:bg-danger-100",
  success: "bg-success-600 text-white hover:bg-success-700 disabled:bg-success-100",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg"; loading?: boolean }
>(function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "md" && "min-h-11 px-4 text-sm",
        size === "lg" && "min-h-14 px-6 text-lg",
        buttonStyles[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
});

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: { href: string; variant?: ButtonVariant; size?: "sm" | "md" | "lg"; className?: string; children: React.ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "md" && "min-h-11 px-4 text-sm",
        size === "lg" && "min-h-14 px-6 text-lg",
        buttonStyles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function Card({ className, children, as: Tag = "section", ...props }: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <Tag className={cn("rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, actions, level = 2 }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <H className={level === 2 ? "text-lg" : "text-base"}>{title}</H>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export type Tone = "neutral" | "info" | "success" | "warn" | "danger";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-gray-100 text-ink-muted border-gray-200",
  info: "bg-navy-50 text-navy-700 border-navy-100",
  success: "bg-success-50 text-success-700 border-success-100",
  warn: "bg-warn-50 text-warn-700 border-warn-100",
  danger: "bg-danger-50 text-danger-700 border-danger-100",
};

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", toneStyles[tone], className)}>
      {children}
    </span>
  );
}

export function Alert({ tone = "info", title, children, className, role }: { tone?: Tone; title?: React.ReactNode; children?: React.ReactNode; className?: string; role?: "alert" | "status" }) {
  return (
    <div role={role ?? (tone === "danger" ? "alert" : "status")} className={cn("rounded-md border px-4 py-3 text-sm", toneStyles[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "neutral", href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "warn" && "text-warn-700", tone === "danger" && "text-danger-700", tone === "success" && "text-success-700")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-lg border border-line bg-surface p-4 shadow-card hover:border-navy-200">
      {body}
    </Link>
  ) : (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-card">{body}</div>
  );
}

export function Field({ label, htmlFor, hint, error, required, children }: { label: React.ReactNode; htmlFor: string; hint?: React.ReactNode; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger-600" aria-hidden> *</span>}
      </label>
      {hint && (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-base text-ink placeholder:text-ink-faint focus:border-navy-500 disabled:bg-gray-50 aria-[invalid=true]:border-danger-600";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputBase, "min-h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputBase, "min-h-28", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(inputBase, "min-h-11 pr-8", className)} {...props} />;
});

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-muted">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl">{title}</h1>
        {description && <p className="mt-1 text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Table({ caption, children, className }: { caption?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-line bg-white", className)}>
      <table className="min-w-full divide-y divide-line text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 align-top", className)}>{children}</td>;
}

export function Pagination({ page, pages, hrefFor, labels }: { page: number; pages: number; hrefFor: (p: number) => string; labels: { previous: string; next: string; page: string } }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
      {page > 1 ? (
        <Link className="rounded px-3 py-2 text-navy-700 hover:bg-navy-50" href={hrefFor(page - 1)}>
          ← {labels.previous}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-ink-muted">{labels.page}</span>
      {page < pages ? (
        <Link className="rounded px-3 py-2 text-navy-700 hover:bg-navy-50" href={hrefFor(page + 1)}>
          {labels.next} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
