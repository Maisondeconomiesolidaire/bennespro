import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, BadgeEuro, PackagePlus, Pencil, Recycle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { DIB_MATERIAL } from "../lib/materials";
import { useAppActions } from "../lib/appActions";
import { UnderlineTabs } from "../components/ui/UnderlineTabs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { FullSpinner, Spinner } from "../components/ui/Spinner";
import { DepotsTable, DepotStats } from "../components/DepotsTable";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/**
 * Page dépôts / DIB. La page DIB est le même composant avec `dibOnly` : mise en
 * page strictement identique (en-tête, onglets, prix, stats, recherche, table)
 * pour qu'aucun élément ne se décale au changement d'onglet — seul le filtre
 * des lignes et les chiffres changent.
 */
export function Depots({ dibOnly = false }: { dibOnly?: boolean }) {
  const navigate = useNavigate();
  const { openNewDepot } = useAppActions();
  const depots = useQuery(api.bennespro.listDepots);
  const settings = useQuery(api.bennespro.getDibSettings);
  const setDibPrice = useMutation(api.bennespro.setDibPrice);
  const [search, setSearch] = useState("");

  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const source = useMemo(() => {
    const list = depots ?? [];
    return dibOnly ? list.filter((d) => d.items.some((it) => it.material === DIB_MATERIAL)) : list;
  }, [depots, dibOnly]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (d) =>
        d.companyName.toLowerCase().includes(q) ||
        d.depositorName.toLowerCase().includes(q) ||
        d.siteRef.toLowerCase().includes(q) ||
        String(d.depotNumber).includes(q),
    );
  }, [source, search]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {dibOnly ? "DIB & facturation" : "Dépôts"}
        </h1>
        <Button onClick={openNewDepot}>
          <PackagePlus className="h-4 w-4" /> Nouveau dépôt
        </Button>
      </div>

      <UnderlineTabs
        items={[
          { key: "all", label: "Tous les dépôts" },
          { key: "dib", label: "DIB & facturation", icon: Recycle },
        ]}
        value={dibOnly ? "dib" : "all"}
        onChange={(key) => navigate(key === "dib" ? "/dib" : "/")}
      />

      {/* ── Prix du DIB (identique sur les deux onglets) ─────────────────────── */}
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
      </div>

      <DepotStats depots={source} countLabel={dibOnly ? "Dépôts DIB" : "Dépôts au total"} />

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher (entreprise, déposant, chantier, n°)…"
        className="max-w-md"
      />

      {depots === undefined ? (
        <FullSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Recycle className="h-8 w-8" />}
          title={search ? "Aucun résultat" : dibOnly ? "Aucun dépôt DIB" : "Aucun dépôt"}
          description={
            search
              ? "Aucun dépôt ne correspond à votre recherche."
              : dibOnly
                ? "Aucun dépôt ne contient de tout-venant / DIB non triés pour l'instant."
                : "Enregistrez un premier dépôt pour le voir apparaître ici."
          }
          action={
            !search && !dibOnly ? (
              <Button onClick={openNewDepot}>
                <PackagePlus className="h-4 w-4" /> Nouveau dépôt
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DepotsTable depots={filtered} />
      )}
    </div>
  );
}
