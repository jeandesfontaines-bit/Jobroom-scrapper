import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-accent text-accent-ink hover:brightness-110 disabled:opacity-50",
  line: "border border-line bg-surface text-ink hover:bg-chip disabled:opacity-50",
  ghost: "text-ink hover:bg-chip disabled:opacity-40",
} as const;

export function Button({
  variant = "line",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-[background-color,transform,filter] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export const controlClass =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20";
