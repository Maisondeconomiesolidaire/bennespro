import { useMemo, useState } from "react";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BadgeEuro,
  ExternalLink,
  Mail,
  Pencil,
  Receipt,
  Recycle,
  RefreshCw,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DIB_MATERIAL, type DepotItem } from "../lib/materials";
import { generateBonDepotPdfBase64 } from "../lib/bonDepotPdf";
import { UnderlineTabs } from "../components/ui/UnderlineTabs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { FullSpinner, Spinner } from "../components/ui/Spinner";
import { DepotDetailModal } from "../components/DepotDetailModal";
import { BillingBadge } from "./Depots";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const KG = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** Poids DIB affichable côté client (kg + tonnes ; m³/unités non facturables). */
function dibWeightKg(items: DepotItem[]): number {
  let kg = 0;
  for (const it of items) {
    if (it.material !== DIB_MATERIAL) continue;
    if (it.unit === "kg") kg += it.quantity;
    else if (it.unit === "tonne") kg += it.quantity * 1000;
  }
  return Math.round(kg * 100) / 100;
}

/** Registre DIB : prix au kg, dépôts concernés et facturation Stripe. */
export function Dib() {
  const navigate = useNavigate();
  const depots = useQuery(api.bennespro.listDepots);
  const settings = useQuery(api.bennespro.getDibSettings);
  const setDibPrice = useMutation(api.bennespro.setDibPrice);
  const billDepot = useMutation(api.bennespro.billDepot);
  const sendInvoiceEmail = useAction(api.bennespro.sendInvoiceEmail);
  const refreshInvoiceStatus = useAction(api.bennespro.refreshInvoiceStatus);
  const convex = useConvex();

  const [selected, setSelected] = useState<Id<"bpDepots"> | null>(null);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [billingId, setBillingId] = useState<Id<"bpDepots"> | null>(null);
  const [billError, setBillError] = useState<string | null>(null);
  const [emailingId, setEmailingId] = useState<Id<"bpDepots"> | null>(null);
  const [refreshingId, setRefreshingId] = useState<Id<"bpDepots"> | null>(null);
  const [emailInfo, setEmailInfo] = useState<string | null>(null);

  const dibDepots = useMemo(
    () => (depots ?? []).filter((d) => d.items.some((it) => it.material === DIB_MATERIAL)),
    [depots],
  );

  async function handleSavePrice() {
    const parsed = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPriceError("Saisissez un prix en euros par kg, ex. 0,32.");
      return;
    }
    setSavingPrice(true);
    setPriceError(null);
    try {
      await setDibPrice({ priceCentsPerKg: Math.round(parsed * 10000) / 100 });
      setEditingPrice(false);
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : "Échec de l'enregistrement du prix.");
    } finally {
      setSavingPrice(false);
    }
  }

  async function handleSendEmail(depotId: Id<"bpDepots">, reminder = false) {
    setEmailingId(depotId);
    setEmailInfo(null);
    setBillError(null);
    try {
      // Le bon de dépôt PDF est généré ici (jsPDF) et joint à l'email.
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
      setEmailInfo(
        `${reminder ? "Relance envoyée" : "Facture envoyée"} par email à ${sentTo} (facture + bon de dépôt en PDF).`,
      );
    } catch (err) {
      setBillError(err instanceof Error ? err.message : "Échec de l'envoi de l'email.");
    } finally {
      setEmailingId(null);
    }
  }

  async function handleBill(depotId: Id<"bpDepots">) {
    setBillingId(depotId);
    setBillError(null);
    try {
      await billDepot({ depotId });
    } catch (err) {
      setBillError(err instanceof Error ? err.message : "Échec de la facturation.");
    } finally {
      setBillingId(null);
    }
  }

  async function handleRefreshStatus(depotId: Id<"bpDepots">) {
    setRefreshingId(depotId);
    setBillError(null);
    try {
      await refreshInvoiceStatus({ depotId });
    } catch (err) {
      setBillError(err instanceof Error ? err.message : "Échec de l'actualisation Stripe.");
    } finally {
      setRefreshingId(null);
    }
  }

  const priceEuros = settings ? settings.priceCentsPerKg / 100 : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">DIB & facturation</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Seul le tout-venant / DIB non triés est facturé, au poids. Les factures sont émises via Stripe.
        </p>
      </div>

      <UnderlineTabs
        items={[
          { key: "all", label: "Tous les dépôts" },
          { key: "dib", label: "DIB & facturation", icon: Recycle },
        ]}
        value="dib"
        onChange={(key) => navigate(key === "dib" ? "/dib" : "/")}
      />

      {/* ── Prix du DIB ───────────────────────────────────────────────────── */}
      <div className="glass-card rounded-xl border border-[var(--border)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
              <BadgeEuro className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Prix du DIB</p>
              {settings === undefined ? (
                <Spinner className="mt-1 h-4 w-4" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  {EUR.format(priceEuros ?? 0)}
                  <span className="text-sm font-semibold text-[var(--muted-foreground)]"> HT / kg</span>
                </p>
              )}
            </div>
          </div>

          {editingPrice ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Input
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="0,32"
                  inputMode="decimal"
                  className="h-10 w-28 pr-12 text-right font-semibold"
                  autoFocus
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--muted-foreground)]">
                  €/kg
                </span>
              </div>
              <Button size="sm" onClick={handleSavePrice} disabled={savingPrice}>
                {savingPrice ? <Spinner className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />} Enregistrer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingPrice(false)} disabled={savingPrice}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setPriceInput(priceEuros !== null ? String(priceEuros).replace(".", ",") : "0,32");
                setEditingPrice(true);
              }}
              disabled={settings === undefined}
            >
              <Pencil className="h-4 w-4" /> Modifier le prix
            </Button>
          )}
        </div>
        {priceError ? <p className="mt-2 text-sm text-red-600">{priceError}</p> : null}
        <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
          Le nouveau prix s'applique aux prochains dépôts (et aux re-facturations). Les lignes DIB en m³ ou à
          l'unité ne sont pas facturables : seuls les poids (kg, tonne) le sont. La TVA de 20% est ajoutée sur la
          facture Stripe.
        </p>
      </div>

      {emailInfo ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">{emailInfo}</p>
      ) : null}

      {billError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{billError}</p>
      ) : null}

      {/* ── Dépôts contenant du DIB ───────────────────────────────────────── */}
      {depots === undefined ? (
        <FullSpinner />
      ) : dibDepots.length === 0 ? (
        <EmptyState
          icon={<Recycle className="h-8 w-8" />}
          title="Aucun dépôt DIB"
          description="Aucun dépôt ne contient de tout-venant / DIB non triés pour l'instant."
        />
      ) : (
        <div className="glass-card overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-semibold">N°</th>
                <th className="px-4 py-3 font-semibold">Entreprise</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Poids DIB</th>
                <th className="px-4 py-3 text-right font-semibold">Montant</th>
                <th className="px-4 py-3 font-semibold">Facturation</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {dibDepots.map((d) => {
                const weight = d.billing?.weightKg ?? dibWeightKg(d.items);
                const amountCents =
                  d.billing?.amountCents ??
                  (settings ? Math.round(weight * settings.priceCentsPerKg) : null);
                const vatRate = d.billing?.vatRate ?? 20;
                const amountTtcCents = amountCents !== null ? Math.round(amountCents * (1 + vatRate / 100)) : null;
                const canBill =
                  weight > 0 && (!d.billing || d.billing.status === "error");
                const canSendReminder =
                  Boolean(d.billing?.stripeInvoiceUrl) && d.billing?.paymentStatus !== "paid";
                return (
                  <tr
                    key={d._id}
                    onClick={() => setSelected(d._id)}
                    className="data-row cursor-pointer border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                      {String(d.depotNumber).padStart(4, "0")}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{d.companyName}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--foreground)]">
                      {weight > 0 ? `${KG.format(weight)} kg` : <span className="text-xs text-[var(--muted-foreground)]">non pesé</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">
                      {amountCents !== null && amountTtcCents !== null && weight > 0 ? (
                        <span className="inline-flex flex-col items-end leading-tight">
                          <span>{EUR.format(amountTtcCents / 100)} TTC</span>
                          <span className="text-xs font-medium text-[var(--muted-foreground)]">
                            {EUR.format(amountCents / 100)} HT
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {d.billing ? (
                        <div className="flex items-center gap-2">
                          <BillingBadge
                            status={d.billing.status}
                            paymentStatus={d.billing.paymentStatus}
                            vatRate={d.billing.vatRate}
                          />
                          {d.billing.status === "error" && d.billing.error ? (
                            <span className="max-w-[220px] truncate text-xs text-red-600" title={d.billing.error}>
                              {d.billing.error}
                            </span>
                          ) : null}
                          {d.billing.stripeInvoiceUrl ? (
                            <>
                              <a
                                href={d.billing.stripeInvoiceUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
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
                                  void handleRefreshStatus(d._id);
                                }}
                              >
                                {refreshingId === d._id ? (
                                  <Spinner className="h-4 w-4" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                Actualiser
                              </Button>
                              {canSendReminder ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={emailingId === d._id}
                                  title="Envoyer une relance de règlement par email à l'entreprise"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleSendEmail(d._id, true);
                                  }}
                                >
                                  {emailingId === d._id ? (
                                    <Spinner className="h-4 w-4" />
                                  ) : (
                                    <Mail className="h-4 w-4" />
                                  )}
                                  Relancer
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">Non facturé</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canBill ? (
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DepotDetailModal depotId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
