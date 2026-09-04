import { useState, type FormEvent } from "react";
import { useAction } from "convex/react";
import { Building2, Search } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/Button";
import { Field, Input } from "./ui/Field";

export type CompanyDirectoryEntry = {
  name: string;
  siren: string;
  siret: string;
  address: string;
  nafCode: string;
};

export function CompanyDirectory({ onSelect, selectLabel = "Utiliser cette entreprise" }: {
  onSelect: (entry: CompanyDirectoryEntry) => void;
  selectLabel?: string;
}) {
  const search = useAction(api.bennespro.searchEnterpriseDirectory);
  const [query, setQuery] = useState("");
  const [nafCode, setNafCode] = useState("");
  const [results, setResults] = useState<CompanyDirectoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim() && !nafCode.trim()) return;
    setLoading(true); setError(null);
    try {
      setResults(await search({ query: query.trim() || undefined, nafCode: nafCode.trim() || undefined }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Recherche impossible.");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
        <Field label="Entreprise, SIREN ou SIRET">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex. Dupont BTP ou 12345678900012" />
        </Field>
        <Field label="Code NAF / APE">
          <Input value={nafCode} onChange={(event) => setNafCode(event.target.value.toUpperCase())} placeholder="Ex. 43.99C" />
        </Field>
        <div className="flex items-end"><Button type="submit" disabled={loading || (!query.trim() && !nafCode.trim())} className="w-full"><Search className="h-4 w-4" />{loading ? "Recherche…" : "Rechercher"}</Button></div>
      </form>
      <p className="text-xs text-[var(--muted-foreground)]">Données publiques de l’Annuaire des entreprises : recherchez par nom, SIREN, SIRET ou code NAF.</p>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {results?.length === 0 ? <p className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm text-[var(--muted-foreground)]">Aucune entreprise active trouvée.</p> : null}
      {results?.length ? <div className="space-y-2">{results.map((entry) => (
        <div key={`${entry.siren}-${entry.siret}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
          <div className="flex min-w-0 gap-3"><Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /><div><p className="font-semibold text-[var(--foreground)]">{entry.name}</p><p className="text-xs text-[var(--muted-foreground)]">{entry.siret ? `SIRET ${entry.siret}` : `SIREN ${entry.siren}`}{entry.nafCode ? ` · NAF ${entry.nafCode}` : ""}</p>{entry.address ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{entry.address}</p> : null}</div></div>
          <Button size="sm" type="button" onClick={() => onSelect(entry)}>{selectLabel}</Button>
        </div>
      ))}</div> : null}
    </div>
  );
}
