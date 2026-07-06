import { cn } from "../../lib/cn";

/** Pastille de statut de facturation d'un dépôt DIB. */
export function BillingBadge({
  status,
  paymentStatus,
}: {
  status: "pending" | "invoiced" | "error";
  paymentStatus?: "draft" | "open" | "paid" | "void" | "uncollectible";
}) {
  const label =
    status === "error"
      ? "Erreur"
      : status === "pending"
        ? "En cours"
        : paymentStatus === "paid"
          ? "Payée"
          : paymentStatus === "void"
            ? "Annulée"
            : paymentStatus === "uncollectible"
              ? "Irrécouvrable"
              : paymentStatus === "draft"
                ? "Brouillon"
                : "En attente de règlement";
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "invoiced" && paymentStatus === "paid" && "bg-brand-100 text-brand-700",
        status === "invoiced" && paymentStatus !== "paid" && "bg-amber-100 text-amber-700",
        status === "pending" && "bg-amber-100 text-amber-700",
        status === "error" && "bg-red-100 text-red-700",
      )}
    >
      {label}
    </span>
  );
}
