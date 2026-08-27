import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, BadgeEuro, PackagePlus, Pencil, Recycle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { DIB_MATERIAL, WOOD_MATERIAL } from "../lib/materials";
import { useAppActions } from "../lib/appActions";
import { UnderlineTabs } from "../components/ui/UnderlineTabs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { FullSpinner, Spinner } from "../components/ui/Spinner";
import { DepotsTable, DepotStats } from "../components/DepotsTable";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/**
 * Page dépôts / facturation. La page dédiée est le même composant avec `dibOnly` : mise en
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
  // Plage horaire de saisie, à la minute et bornes incluses : 07:00 → 08:00
  // retient 08:00 pile, mais pas 08:01.
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");

  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const source = useMemo(() => {
    const list = depots ?? [];
    return dibOnly
      ? list.filter((d) => d.items.some((it) => it.material === DIB_MATERIAL || it.material === WOOD_MATERIAL))
      : list;
  }, [depots, dibOnly]);

  const hourRange = useMemo(() => {
    /** « HH:MM » → minutes depuis minuit, pour comparer sans manipuler de dates. */
    const parse = (value: string) => {
      const match = value.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (hours > 23 || minutes > 59) return null;
      return hours * 60 + minutes;
    };
    const from = parse(fromTime);
    const to = parse(toTime);
    // Bornes inversées (« de 17:00 à 08:00 ») : on les remet dans l'ordre plutôt
    // que de renvoyer une liste vide sans expliquer pourquoi.
    if (from !== null && to !== null && from > to) return { from: to, to: from };
    return { from, to };
  }, [fromTime, toTime]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const { from, to } = hourRange;
    if (!q && from === null && to === null) return source;
    return source.filter((d) => {
      if (
        q &&
        !(
          d.companyName.toLowerCase().includes(q) ||
          d.depositorName.toLowerCase().includes(q) ||
          d.siteRef.toLowerCase().includes(q) ||
          String(d.depotNumber).includes(q)
        )
      ) {
        return false;
      }
      const at = new Date(d.createdAt);
      const minuteOfDay = at.getHours() * 60 + at.getMinutes();
      if (from !== null && minuteOfDay < from) return false;
      if (to !== null && minuteOfDay > to) return false;
      return true;
    });
  }, [source, search, hourRange]);

  const hourFilterActive = hourRange.from !== null || hourRange.to !== null;

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
          {dibOnly ? "Facturation" : "Dépôts"}
        </h1>
        <Button onClick={openNewDepot}>
          <PackagePlus className="h-4 w-4" /> Nouveau dépôt
        </Button>
      </div>

      <UnderlineTabs
        items={[
          { key: "all", label: "Tous les dépôts" },
          { key: "dib", label: "Facturation", icon: Recycle },
        ]}
        value={dibOnly ? "dib" : "all"}
        onChange={(key) => navigate(key === "dib" ? "/crm/dib" : "/crm")}
      />

      {/* ── Prix des matières payantes (identique sur les deux onglets) ─────── */}
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
              {settings !== undefined ? (
                <p className="text-xs font-medium text-[var(--muted-foreground)]">
                  Bois : {EUR.format((settings?.woodPriceCentsPerKg ?? 17) / 100)} HT / kg
                </p>
              ) : null}
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

      <DepotStats depots={source} countLabel={dibOnly ? "Dépôts facturables" : "Dépôts au total"} />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (entreprise, déposant, chantier, n°)…"
          className="max-w-md flex-1"
        />
        <div className="flex items-end gap-2">
          <TimeInput label="De" value={fromTime} onChange={setFromTime} />
          <TimeInput label="À" value={toTime} onChange={setToTime} />
          {hourFilterActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromTime("");
                setToTime("");
              }}
            >
              Effacer
            </Button>
          ) : null}
        </div>
      </div>

      {hourFilterActive ? (
        <p className="-mt-2 text-sm text-[var(--muted-foreground)]">
          {filtered.length} dépôt{filtered.length > 1 ? "s" : ""} enregistré
          {filtered.length > 1 ? "s" : ""} {describeHourRange(hourRange)}.
        </p>
      ) : null}

      {depots === undefined ? (
        <FullSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Recycle className="h-8 w-8" />}
          title={search || hourFilterActive ? "Aucun résultat" : dibOnly ? "Aucun dépôt facturable" : "Aucun dépôt"}
          description={
            search || hourFilterActive
              ? "Aucun dépôt ne correspond à ces critères."
              : dibOnly
                ? "Aucun dépôt ne contient de DIB ou de bois facturable pour l'instant."
                : "Enregistrez un premier dépôt pour le voir apparaître ici."
          }
          action={
            !search && !hourFilterActive && !dibOnly ? (
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

/** Borne de la plage horaire, à la minute près. */
function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
      {label}
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 text-sm text-[var(--foreground)]"
      />
    </label>
  );
}

/** « entre 07:00 et 08:00 », « à partir de 17:00 », « jusqu'à 09:30 ». */
function describeHourRange({ from, to }: { from: number | null; to: number | null }) {
  const label = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  if (from !== null && to !== null) return `entre ${label(from)} et ${label(to)}`;
  if (from !== null) return `à partir de ${label(from)}`;
  return `jusqu'à ${label(to!)}`;
}
