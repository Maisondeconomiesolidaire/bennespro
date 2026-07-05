import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Euro, PackagePlus, Recycle, Scale } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DIB_MATERIAL } from "../lib/materials";
import { useAppActions } from "../lib/appActions";
import { UnderlineTabs } from "../components/ui/UnderlineTabs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { FullSpinner } from "../components/ui/Spinner";
import { DepotDetailModal } from "../components/DepotDetailModal";
import { cn } from "../lib/cn";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const KG = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function Depots() {
  const navigate = useNavigate();
  const { openNewDepot } = useAppActions();
  const depots = useQuery(api.bennespro.listDepots);
  const [selected, setSelected] = useState<Id<"bpDepots"> | null>(null);
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

  const stats = useMemo(() => {
    const list = depots ?? [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let dibKg = 0;
    let dibCents = 0;
    for (const d of list) {
      if (d.billing) {
        dibKg += d.billing.weightKg;
        dibCents += d.billing.amountCents;
      }
    }
    return {
      total: list.length,
      thisMonth: list.filter((d) => d.createdAt >= monthStart).length,
      dibKg,
      dibCents,
    };
  }, [depots]);

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Recycle} label="Dépôts au total" value={String(stats.total)} />
        <StatCard icon={CalendarDays} label="Ce mois-ci" value={String(stats.thisMonth)} />
        <StatCard icon={Scale} label="DIB facturable" value={`${KG.format(stats.dibKg)} kg`} />
        <StatCard icon={Euro} label="DIB facturé" value={EUR.format(stats.dibCents / 100)} />
      </div>

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
        <div className="glass-card overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-semibold">N°</th>
                <th className="px-4 py-3 font-semibold">Entreprise</th>
                <th className="px-4 py-3 font-semibold">Déposant</th>
                <th className="px-4 py-3 font-semibold">Déchets</th>
                <th className="px-4 py-3 font-semibold">DIB</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const hasDib = d.items.some((it) => it.material === DIB_MATERIAL);
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
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{d.depositorName}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {d.items.length} ligne{d.items.length > 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3">
                      {hasDib ? (
                        d.billing ? (
                          <BillingBadge status={d.billing.status} amountCents={d.billing.amountCents} />
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Non facturé
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {new Date(d.createdAt).toLocaleDateString("fr-FR")}
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

export function BillingBadge({
  status,
  amountCents,
}: {
  status: "pending" | "invoiced" | "error";
  amountCents?: number;
}) {
  const amount = amountCents !== undefined ? ` · ${EUR.format(amountCents / 100)}` : "";
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "invoiced" && "bg-brand-100 text-brand-700",
        status === "pending" && "bg-amber-100 text-amber-700",
        status === "error" && "bg-red-100 text-red-700",
      )}
    >
      {status === "invoiced" ? "Facturé" : status === "pending" ? "En cours" : "Erreur"}
      {amount}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Recycle;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-card flex items-center gap-3 rounded-xl border border-[var(--border)] p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
        <p className="truncate text-lg font-bold tracking-tight text-[var(--foreground)]">{value}</p>
      </div>
    </div>
  );
}
