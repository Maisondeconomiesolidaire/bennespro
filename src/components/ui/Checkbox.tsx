import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Case à cocher custom, avec libellé cliquable optionnel. */
export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 select-none",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
          checked
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-[var(--border-strong)] bg-[var(--input)]",
          "peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/20",
        )}
      >
        <Check className={cn("h-3.5 w-3.5 transition-opacity", checked ? "opacity-100" : "opacity-0")} strokeWidth={3} />
      </span>
      {label || description ? (
        <span className="min-w-0">
          {label ? <span className="block text-sm font-medium text-[var(--foreground)]">{label}</span> : null}
          {description ? <span className="block text-xs text-[var(--muted-foreground)]">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}
