import { useEffect } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert } from "lucide-react";
import { Button } from "./Button";
import { Spinner } from "./Spinner";

/**
 * Boîte de confirmation « Êtes-vous sûr(e) ? » pour les actions destructrices.
 * Rendue par-dessus les autres modales (z-index élevé).
 */
export function ConfirmDialog({
  open,
  title = "Êtes-vous sûr(e) ?",
  message,
  confirmLabel = "Supprimer définitivement",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="absolute inset-0" onClick={() => !busy && onCancel()} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        className="animate-enter relative z-10 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-strong)]"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <TriangleAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Annuler
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
