import { useState, type ReactNode } from "react";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CalendarDays, Euro, ExternalLink, Mail, Receipt, RefreshCw, Scale, Wallet } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DIB_MATERIAL, type DepotItem } from "../lib/materials";
import { generateBonDepotPdfBase64 } from "../lib/bonDepotPdf";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";
import { BillingBadge } from "./ui/BillingBadge";
import { DepotDetailModal } from "./DepotDetailModal";
import { cn } from "../lib/cn";

export { BillingBadge } from "./ui/BillingBadge";

export type DepotListItem = FunctionReturnType<typeof api.bennespro.listDepots>[number];

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const KG = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** Poids DIB facturable (kg + tonnes ; m³/unités non facturables). */
export function dibWeightKg(items: DepotItem[]): number {
  let kg = 0;
  for (const it of items) {
    if (it.material !== DIB_MATERIAL) continue;
    if (it.unit === "kg") kg += it.quantity;
    else if (it.unit === "tonne") kg += it.quantity * 1000;
  }
  return Math.round(kg * 100) / 100;
}

/** Montant TTC (centimes) à partir du HT et du taux de TVA. */
function ttcCents(amountCents: number, vatRate = 20): number {
  return Math.round(amountCents * (1 + vatRate / 100));
}

/** Cartes de statistiques (facturation DIB) — partagées Dépôts / DIB. */
export function DepotStats({ depots, countLabel }: { depots: DepotListItem[]; countLabel: string }) {
  let dibKg = 0;
  let invoicedTtc = 0;
  let pendingTtc = 0;
  let paidTtc = 0;
  for (const d of depots) {
    dibKg += dibWeightKg(d.items);
    const b = d.billing;
    if (b && b.status === "invoiced") {
      const ttc = ttcCents(b.amountCents, b.vatRate ?? 20);
      invoicedTtc += ttc;
      if (b.paymentStatus === "paid") paidTtc += ttc;
      else pendingTtc += ttc;
    }
  }
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard icon={CalendarDays} label={countLabel} value={String(depots.length)} />
      <StatCard icon={Scale} label="Poids DIB total" value={`${KG.format(dibKg)} kg`} />
      <StatCard icon={Euro} label="Total facturé (TTC)" value={EUR.format(invoicedTtc / 100)} />
      <StatCard icon={Wallet} label="En attente (TTC)" value={EUR.format(pendingTtc / 100)} tone={pendingTtc > 0 ? "amber" : "default"} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  tone?: "default" | "amber";
}) {
  return (
    <div className="glass-card flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 sm:p-4">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10",
          tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-600",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
        <p className="truncate text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg">{value}</p>
      </div>
    </div>
  );
}

/**
 * Table des dépôts partagée par les pages « Dépôts » et « DIB » — colonnes,
 * montants HT/TTC, statut de facturation et actions (facture, actualisation,
 * relance, facturation) identiques. La page DIB ne fait que filtrer les lignes.
 */
export function DepotsTable({ depots }: { depots: DepotListItem[] }) {
  const settings = useQuery(api.bennespro.getDibSettings);
  const billDepot = useMutation(api.bennespro.billDepot);
  const sendInvoiceEmail = useAction(api.bennespro.sendInvoiceEmail);
  const refreshInvoiceStatus = useAction(api.bennespro.refreshInvoiceStatus);
  const convex = useConvex();

  const [selected, setSelected] = useState<Id<"bpDepots"> | null>(null);
  const [billingId, setBillingId] = useState<Id<"bpDepots"> | null>(null);
  const [emailingId, setEmailingId] = useState<Id<"bpDepots"> | null>(null);
  const [refreshingId, setRefreshingId] = useState<Id<"bpDepots"> | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const priceCentsPerKg = settings?.priceCentsPerKg ?? null;

  async function handleBill(depotId: Id<"bpDepots">) {
    setBillingId(depotId);
    setError(null);
    setInfo(null);
    try {
      await billDepot({ depotId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la facturation.");
    } finally {
      setBillingId(null);
    }
  }

  async function handleRefresh(depotId: Id<"bpDepots">) {
    setRefreshingId(depotId);
    setError(null);
    try {
      await refreshInvoiceStatus({ depotId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'actualisation Stripe.");
    } finally {
      setRefreshingId(null);
    }
  }

  async function handleSendEmail(depotId: Id<"bpDepots">, reminder: boolean) {
    setEmailingId(depotId);
    setError(null);
    setInfo(null);
    try {
      let bonPdfBase64: string | undefined;
      try {
        const depot = await convex.query(api.bennespro.getDepot, { depotId });
        if (depot) {
          bonPdfBase64 = await generateBonDepotPdfBase64({
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
        }
      } catch {
        // Bon indisponible : l'email part quand même avec la facture.
      }
      const { sentTo } = await sendInvoiceEmail({ depotId, bonPdfBase64, reminder });
      setInfo(`${reminder ? "Relance envoyée" : "Facture envoyée"} par email à ${sentTo}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi de l'email.");
    } finally {
      setEmailingId(null);
    }
  }

  /** Actions de facturation d'une ligne (réutilisées bureau + mobile). */
  function actions(d: DepotListItem): ReactNode {
    const weight = d.billing?.weightKg ?? dibWeightKg(d.items);
    const canBill = weight > 0 && (!d.billing || d.billing.status === "error");
    const canReminder = Boolean(d.billing?.stripeInvoiceUrl) && d.billing?.paymentStatus !== "paid";
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {d.billing?.stripeInvoiceUrl ? (
          <>
            <a
              href={d.billing.stripeInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-[var(--accent)]"
            >
              Facture <ExternalLink className="h-3 w-3" />
            </a>
            <Button
              size="sm"
              variant="ghost"
              disabled={refreshingId === d._id}
              title="Actualiser le statut depuis Stripe"
              onClick={(e) => {
                e.stopPropagation();
                void handleRefresh(d._id);
              }}
            >
              {refreshingId === d._id ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
              Actualiser
            </Button>
            {canReminder ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={emailingId === d._id}
                title="Envoyer une relance de règlement par email"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleSendEmail(d._id, true);
                }}
              >
                {emailingId === d._id ? <Spinner className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                Relancer
              </Button>
            ) : null}
          </>
        ) : canBill ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={billingId === d._id}
            onClick={(e) => {
              e.stopPropagation();
              void handleBill(d._id);
            }}
          >
            {billingId === d._id ? <Spinner className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
            {d.billing?.status === "error" ? "Refacturer" : "Facturer"}
          </Button>
        ) : null}
      </div>
    );
  }

  /** Montant HT/TTC d'une ligne (ou estimation si pas encore facturé). */
  function amount(d: DepotListItem) {
    const weight = d.billing?.weightKg ?? dibWeightKg(d.items);
    if (weight <= 0) return null;
    const htCents = d.billing?.amountCents ?? (priceCentsPerKg !== null ? Math.round(weight * priceCentsPerKg) : null);
    if (htCents === null) return null;
    const vat = d.billing?.vatRate ?? 20;
    return { htCents, ttcCents: ttcCents(htCents, vat) };
  }

  return (
    <div className="space-y-3">
      {info ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">{info}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="glass-card overflow-hidden rounded-xl border border-[var(--border)]">
        {/* ── Bureau : tableau ─────────────────────────────────────────────── */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-semibold">N°</th>
                <th className="px-4 py-3 font-semibold">Entreprise</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Date</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Poids DIB</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Montant</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {depots.map((d) => {
                const weight = d.billing?.weightKg ?? dibWeightKg(d.items);
                const amt = amount(d);
                return (
                  <tr
                    key={d._id}
                    onClick={() => setSelected(d._id)}
                    className="data-row cursor-pointer border-t border-[var(--border)] align-middle"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--foreground)]">
                      {String(d.depotNumber).padStart(4, "0")}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{d.companyName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)]">
                      {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--foreground)]">
                      {weight > 0 ? `${KG.format(weight)} kg` : <span className="text-xs text-[var(--muted-foreground)]">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {amt ? (
                        <>
                          <div className="font-semibold text-[var(--foreground)]">
                            {EUR.format(amt.ttcCents / 100)}
                            <span className="ml-1 text-xs font-normal text-[var(--muted-foreground)]">TTC</span>
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)]">{EUR.format(amt.htCents / 100)} HT</div>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {d.billing ? (
                        <BillingBadge status={d.billing.status} paymentStatus={d.billing.paymentStatus} />
                      ) : weight > 0 ? (
                        <span className="inline-flex whitespace-nowrap rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                          Non facturé
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">{actions(d)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile : cartes ──────────────────────────────────────────────── */}
        <div className="divide-y divide-[var(--border)] md:hidden">
          {depots.map((d) => {
            const weight = d.billing?.weightKg ?? dibWeightKg(d.items);
            const amt = amount(d);
            return (
              <div
                key={d._id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(d._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(d._id);
                }}
                className="flex cursor-pointer flex-col gap-2 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--foreground)]">{d.companyName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      N° {String(d.depotNumber).padStart(4, "0")} · {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  {d.billing ? (
                    <BillingBadge status={d.billing.status} paymentStatus={d.billing.paymentStatus} />
                  ) : weight > 0 ? (
                    <span className="inline-flex whitespace-nowrap rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                      Non facturé
                    </span>
                  ) : null}
                </div>
                <div className="flex items-end justify-between gap-2">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {weight > 0 ? `${KG.format(weight)} kg de DIB` : "Pas de DIB pesé"}
                  </span>
                  {amt ? (
                    <span className="text-right">
                      <span className="block font-semibold text-[var(--foreground)]">
                        {EUR.format(amt.ttcCents / 100)} <span className="text-xs font-normal text-[var(--muted-foreground)]">TTC</span>
                      </span>
                      <span className="block text-xs text-[var(--muted-foreground)]">{EUR.format(amt.htCents / 100)} HT</span>
                    </span>
                  ) : null}
                </div>
                {actions(d)}
              </div>
            );
          })}
        </div>
      </div>

      <DepotDetailModal depotId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
