import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-md border border-line-strong bg-raised px-3.5 text-[15px] text-strong placeholder:text-muted/80 " +
  "transition-colors duration-150 hover:border-action/60 focus:border-action focus:outline-none focus-visible:outline-3 focus-visible:outline-signal " +
  "aria-[invalid=true]:border-danger disabled:opacity-60";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string; required?: boolean }>;
}

/** Rótulo, dica e erro ligados ao controle por id/aria (a11y estrutural, não opcional). */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-strong">
        {label}
        {required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {isValidElement(children) &&
        cloneElement(children, { id, "aria-invalid": Boolean(error), "aria-describedby": describedBy, required })}
      {hint && !error && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[13px] font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(control, "h-11", className)} {...rest} />
);

export const Textarea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(control, "min-h-28 py-2.5 leading-relaxed", className)} {...rest} />
);

export const Select = ({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(control, "h-11 cursor-pointer pr-8", className)} {...rest} />
);

export function Checkbox({ label, error, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-body">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--brand-navy)]"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="pl-8 text-[13px] font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Campo-armadilha para robôs: invisível e fora da ordem de tabulação. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Site
        <input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} name="website" />
      </label>
    </div>
  );
}
