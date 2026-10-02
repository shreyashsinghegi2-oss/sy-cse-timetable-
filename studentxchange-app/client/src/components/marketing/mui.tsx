import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "wouter";
import { cn } from "./cn";

type Variant = "primary" | "dark" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  primary: "bg-sky text-ink hover:bg-sky-600 hover:text-white",
  dark: "bg-ink text-white hover:bg-ink-2",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
};
const sizes: Record<Size, string> = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };
const cls = (v: Variant, s: Size, extra?: string) => cn(base, variants[v], sizes[s], extra);

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  ({ variant = "primary", size = "md", className, ...p }, ref) => <button ref={ref} className={cls(variant, size, className)} {...p} />,
);

export function ButtonLink({ variant = "primary", size = "md", className, href, children, ...p }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant; size?: Size }) {
  return <Link href={href} className={cls(variant, size, className)} {...(p as object)}>{children}</Link>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-line bg-surface shadow-card", className)}>{children}</div>;
}

type Tone = "neutral" | "sky" | "dark" | "success" | "warning";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-subtle",
  sky: "bg-sky-100 text-sky-600",
  dark: "bg-ink text-white",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, id, className, ...p }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <label htmlFor={inputId} className="block">
        <span className="mb-1.5 block text-sm font-medium">{label}</span>
        <input
          ref={ref}
          id={inputId}
          className={cn("h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-subtle/70 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky/30", className)}
          {...p}
        />
      </label>
    );
  },
);

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div className="h-full rounded-full bg-sky transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink">
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden><path d="M7 9h18M7 23h18M11 9l10 14M21 9L11 23" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" /></svg>
      </span>
      <span className={light ? "text-white" : "text-ink"}>StudentXchange</span>
    </span>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line px-6 py-16 text-center">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-subtle">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-subtle">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
