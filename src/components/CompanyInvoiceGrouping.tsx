import { billingTotals } from "../../convex/lib/bpMonthlyBilling";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useToast } from "./ui/Toast";
import { useAccess } from "./RequirePermission";
import { canAccess, PAGE_DEPOTS } from "../lib/permissions";

export function CompanyInvoiceGrouping({ companyId, selected, canGroup, onCreated }: {
  companyId: Id<"bpCompanies">;
  selected: Doc<"bpDepots">[];
  canGroup: boolean;
  onCreated: () => void;
}) {
  const access = useAccess();
  const batches = useQuery(api.bennesproGrouping.list, canAccess(access, PAGE_DEPOTS, "read") ? { companyId } : "skip");
  const create = useMutation(api.bennesproGrouping.create);
  const retry = useMutation(api.bennesproGrouping.retry);
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const totals = billingTotals(selected);
  const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  const amount = euros.format(totals.ht / 100);
  const amountTtc = euros.format(totals.ttc / 100);
  const previousCount = new Set(selected.flatMap(d => d.billing?.stripeInvoiceId ? [d.billing.stripeInvoiceId] : [])).size;
  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      await create({ companyId, depotIds: selected.map(d => d._id) });
      setConfirm(false);
      onCreated();
      toast.success("Regroupement lancé. Le résultat apparaîtra ci-dessous.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Regroupement impossible."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">
    {canGroup ? <div className="rounded-lg border border-[var(--border)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">Facture groupée</p><p className="text-sm text-[var(--muted-foreground)]">{selected.length} dépôt(s) sélectionné(s) · {amount} HT · <strong>{amountTtc} TTC</strong></p></div>
        <Button disabled={busy || selected.length < 2 || selected.length > 250} onClick={() => setConfirm(true)}>Regrouper et envoyer</Button>
      </div>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">Sélectionnez les dépôts DIB / Bois à regrouper. Les anciennes factures encore impayées seront annulées et remplacées par une facture détaillée unique envoyée au client, accompagnée de tous les bons de dépôt concernés. Les factures réglées ou annulées sont exclues. Une facture déjà groupée se sélectionne en entier.</p>
      {selected.length > 250 ? <p className="mt-2 text-sm text-red-600">250 dépôts maximum par facture Stripe. Réduisez la sélection.</p> : null}
    </div> : null}
    {batches?.filter(b => b.kind === "manual").map(batch => <div key={batch._id} role="status" className="rounded-lg border border-[var(--border)] p-3 text-sm">
      <p className="font-semibold">{batch.status === "sent" ? "Facture groupée envoyée" : batch.status === "canceled" ? "Regroupement annulé" : batch.error ? "Regroupement à reprendre" : "Regroupement en cours…"} · {batch.count} dépôt(s) sélectionné(s)</p>
      {batch.error ? <p className="mt-1 text-red-600">{batch.error}</p> : null}
      {batch.excluded.map(source => <p key={source.invoiceId} className="mt-1 text-[var(--muted-foreground)]">Facture {source.invoiceId} : {source.reason}</p>)}
      {batch.stripeInvoiceUrl ? <a className="mt-2 inline-block font-semibold text-brand-600 underline" href={batch.stripeInvoiceUrl} target="_blank" rel="noreferrer">Ouvrir la facture groupée</a> : null}
      {canGroup && batch.status === "pending" && batch.error ? <Button size="sm" variant="secondary" className="mt-2" onClick={() => { void retry({ id: batch._id }).catch(error => toast.error(error instanceof Error ? error.message : "Reprise impossible.")); }}>Reprendre le regroupement</Button> : null}
    </div>)}
    <ConfirmDialog open={confirm} title="Créer la facture groupée ?" message={`${selected.length} dépôts, ${amount} HT / ${amountTtc} TTC. Les ${previousCount} anciennes factures encore impayées seront annulées puis remplacées par une facture détaillée envoyée au client. Le statut Stripe est revérifié avant l'annulation : les règlements intervenus entre-temps seront exclus.`} confirmLabel="Regrouper et envoyer" busy={busy} onConfirm={() => void submit()} onCancel={() => setConfirm(false)} />
  </div>;
}
