import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "whatsapp" | "danger" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-pill font-semibold whitespace-nowrap select-none " +
  "transition-[color,background-color,border-color,transform] duration-200 ease-out " +
  "disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-action text-action-text shadow-sm not-disabled:hover:bg-action-hover not-disabled:hover:shadow-md",
  secondary: "border border-line-strong bg-raised text-strong not-disabled:hover:border-navy not-disabled:hover:text-navy",
  ghost: "text-strong not-disabled:hover:bg-sunken",
  whatsapp: "bg-whatsapp text-white not-disabled:hover:brightness-110",
  danger: "border border-danger/40 text-danger not-disabled:hover:bg-danger-soft",
  inverse: "bg-white text-navy not-disabled:hover:bg-canvas",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-[15px]",
};

export const buttonClass = (variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) =>
  cn(base, variants[variant], sizes[size], className);

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant, size, loading, className, children, disabled, type = "button", ...rest }: Props) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant,
  size,
  className,
  ...rest
}: LinkProps & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function AnchorButton({
  variant,
  size,
  className,
  external,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; size?: ButtonSize; external?: boolean }) {
  return (
    <a
      className={buttonClass(variant, size, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...rest}
    />
  );
}
