import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Download, ExternalLink, Trash2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { unitLabel } from "../lib/materials";
import { generateBonDepotPdf } from "../lib/bonDepotPdf";
import { canAccess, PAGE_DEPOTS } from "../lib/permissions";
import { useAccess } from "./RequirePermission";
import { BillingBadge } from "./ui/BillingBadge";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";
import { FullSpinner } from "./ui/Spinner";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useToast } from "./ui/Toast";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function DepotDetailModal({
  depotId,
  onClose,
}: {
  depotId: Id<"bpDepots"> | null;
  onClose: () => void;
}) {
  const depot = useQuery(api.bennespro.getDepot, depotId ? { depotId } : "skip");
  const deleteDepot = useAction(api.bennespro.deleteDepot);
  const access = useAccess();
  const toast = useToast();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = canAccess(access, PAGE_DEPOTS, "delete");

  async function handleDelete() {
    if (!depotId) return;
    setDeleting(true);
    try {
      await deleteDepot({ depotId });
      toast.success("Dépôt supprimé définitivement.");
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la suppression.");
    } finally {
      setDeleting(false);
    }
  }

  async function handlePdf() {
    if (!depot) return;
    setPdfBusy(true);
    try {
      await generateBonDepotPdf({
        depotNumber: depot.depotNumber,
        createdAt: depot.createdAt,
        depositorName: depot.depositorName,
        siteRef: depot.siteRef,
        items: depot.items,
        comment: depot.comment,
        company: depot.company,
        vehicle: depot.vehicle,
        signatureUrl: depot.signatureUrl,
      });
    } finally {
      setPdfBusy(false);
    }
  }

  const photos = depot
    ? [
        { label: "Ticket", url: depot.ticketUrl },
        { label: "Extérieur camion", url: depot.truckExteriorUrl },
        { label: "Intérieur camion", url: depot.truckInteriorUrl },
        ...depot.attachmentUrls.map((url, i) => ({ label: `Pièce jointe ${i + 1}`, url })),
      ].filter((p) => p.url)
    : [];

  return (
    <Modal
      open={depotId !== null}
      onClose={onClose}
      title={depot ? `Dépôt n° ${String(depot.depotNumber).padStart(4, "0")}` : "Dépôt"}
    >
      {depot === undefined ? (
        <FullSpinner />
      ) : depot === null ? (
        <p className="text-sm text-[var(--muted-foreground)]">Dépôt introuvable.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Info label="Entreprise" value={depot.company?.name ?? "—"} />
              <Info label="SIRET" value={depot.company?.siret ?? "—"} />
              <Info label="Véhicule" value={depot.vehicle?.label ?? "—"} />
              <Info label="Déposant" value={depot.depositorName} />
              <Info label="Réf. chantier" value={depot.siteRef} />
              <Info label="Date" value={new Date(depot.createdAt).toLocaleString("fr-FR")} />
              {depot.billing ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-[var(--muted-foreground)]">Facturation ({depot.billing.weightKg} kg)</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <BillingBadge
                      status={depot.billing.status}
                      paymentStatus={depot.billing.paymentStatus}
                    />
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">
                      {EUR.format(depot.billing.amountCents / 100)} HT ·{" "}
                      {EUR.format((depot.billing.amountCents * (1 + (depot.billing.vatRate ?? 20) / 100)) / 100)} TTC
                    </span>
                    {depot.billing.paidAt ? (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Payée le {new Date(depot.billing.paidAt).toLocaleDateString("fr-FR")}
                      </span>
                    ) : null}
                    {depot.billing.stripeInvoiceUrl ? (
                      <a
                        href={depot.billing.stripeInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                      >
                        Voir la facture Stripe <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                    {depot.billing.status === "error" && depot.billing.error ? (
                      <span className="text-xs text-red-600">{depot.billing.error}</span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <Button onClick={handlePdf} disabled={pdfBusy}>
              {pdfBusy ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Bon PDF
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full min-w-[380px] text-sm">
              <thead className="bg-[var(--muted)] text-left text-xs text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-2">Matériau</th>
                  <th className="px-3 py-2">Quantité</th>
                  <th className="px-3 py-2">Réf. chantier</th>
                </tr>
              </thead>
              <tbody>
                {depot.items.map((it, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 font-medium text-[var(--foreground)]">{it.material}</td>
                    <td className="px-3 py-2">{it.quantity} {unitLabel(it.unit)}</td>
                    <td className="px-3 py-2 text-[var(--muted-foreground)]">{it.siteRef || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {depot.comment ? (
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Commentaire</p>
              <p className="text-sm text-[var(--foreground)]">{depot.comment}</p>
            </div>
          ) : null}

          {photos.length > 0 ? (
            <div>
              <p className="mb-2 text-xs text-[var(--muted-foreground)]">Pièces jointes</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((p, i) => (
                  <a key={i} href={p.url ?? undefined} target="_blank" rel="noreferrer" className="block">
                    <img src={p.url ?? undefined} alt={p.label} loading="lazy" decoding="async" className="aspect-square w-full rounded-lg border border-[var(--border)] object-cover" />
                    <span className="mt-1 block text-center text-xs text-[var(--muted-foreground)]">{p.label}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {depot.signatureUrl ? (
            <div>
              <p className="mb-1 text-xs text-[var(--muted-foreground)]">Signature du déposant</p>
              <img src={depot.signatureUrl} alt="Signature" className="h-24 rounded-lg border border-[var(--border)] bg-white object-contain p-2" />
            </div>
          ) : null}

          {canDelete ? (
            <div className="flex justify-end border-t border-[var(--border)] pt-4">
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" /> Supprimer définitivement
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        message={
          depot
            ? `Le dépôt n° ${String(depot.depotNumber).padStart(4, "0")} sera supprimé définitivement (photos et bon de dépôt inclus). Sa facture Stripe non réglée sera annulée. Cette action est irréversible.`
            : ""
        }
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
