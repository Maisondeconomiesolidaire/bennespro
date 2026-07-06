import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { PackagePlus, Recycle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useAppActions } from "../lib/appActions";
import { UnderlineTabs } from "../components/ui/UnderlineTabs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { FullSpinner } from "../components/ui/Spinner";
import { DepotsTable, DepotStats } from "../components/DepotsTable";

export function Depots() {
  const navigate = useNavigate();
  const { openNewDepot } = useAppActions();
  const depots = useQuery(api.bennespro.listDepots);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = depots ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (d) =>
        d.companyName.toLowerCase().includes(q) ||
        d.depositorName.toLowerCase().includes(q) ||
        d.siteRef.toLowerCase().includes(q) ||
        String(d.depotNumber).includes(q),
    );
  }, [depots, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Dépôts</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Dépôts de déchets enregistrés et bons de dépôt.</p>
        </div>
        <Button onClick={openNewDepot}>
          <PackagePlus className="h-4 w-4" /> Nouveau dépôt
        </Button>
      </div>

      <DepotStats depots={depots ?? []} countLabel="Dépôts au total" />

      <UnderlineTabs
        items={[
          { key: "all", label: "Tous les dépôts" },
          { key: "dib", label: "DIB & facturation", icon: Recycle },
        ]}
        value="all"
        onChange={(key) => navigate(key === "dib" ? "/dib" : "/")}
      />

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
          title={search ? "Aucun résultat" : "Aucun dépôt"}
          description={
            search
              ? "Aucun dépôt ne correspond à votre recherche."
              : "Enregistrez un premier dépôt pour le voir apparaître ici."
          }
          action={
            !search ? (
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
