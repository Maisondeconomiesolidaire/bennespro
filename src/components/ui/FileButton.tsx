import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * Champ de sélection de fichier entièrement en français (le libellé natif
 * « Choose file / No file chosen » dépend du navigateur). Bouton + nom du
 * fichier sélectionné.
 */
export function FileButton({
  onFile,
  accept,
  selectedName,
  disabled,
  label = "Choisir un fichier",
  className,
}: {
  onFile: (file: File | null) => void;
  accept?: string;
  selectedName?: string | null;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={disabled}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent)] disabled:opacity-60"
      >
        <Paperclip className="h-4 w-4" />
        {label}
      </button>
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--muted-foreground)]">
        {selectedName || "Aucun fichier sélectionné"}
      </span>
      <input
        ref={ref}
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
