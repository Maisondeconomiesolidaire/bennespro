import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, BadgeEuro, Pencil, Recycle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { DIB_MATERIAL } from "../lib/materials";
import { UnderlineTabs } from "../components/ui/UnderlineTabs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { FullSpinner, Spinner } from "../components/ui/Spinner";
import { DepotsTable, DepotStats } from "../components/DepotsTable";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Registre DIB : réglage du prix, stats de facturation et dépôts DIB (même table). */
export function Dib() {
  const navigate = useNavigate();
  const depots = useQuery(api.bennespro.listDepots);
  const settings = useQuery(api.bennespro.getDibSettings);
  const setDibPrice = useMutation(api.bennespro.setDibPrice);

  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

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

  const priceEuros = settings ? settings.priceCentsPerKg / 100 : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">DIB & facturation</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Seul le tout-venant / DIB non triés est facturé, au poids. Les factures sont émises via Stripe (TVA 20 %).
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
          l'unité ne sont pas facturables : seuls les poids (kg, tonne) le sont. La TVA de 20 % est ajoutée sur la
          facture Stripe.
        </p>
      </div>

      <DepotStats depots={dibDepots} countLabel="Dépôts DIB" />

      {depots === undefined ? (
        <FullSpinner />
      ) : dibDepots.length === 0 ? (
        <EmptyState
          icon={<Recycle className="h-8 w-8" />}
          title="Aucun dépôt DIB"
          description="Aucun dépôt ne contient de tout-venant / DIB non triés pour l'instant."
        />
      ) : (
        <DepotsTable depots={dibDepots} />
      )}
    </div>
  );
}
