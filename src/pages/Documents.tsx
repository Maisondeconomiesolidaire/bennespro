import { useState } from "react";
import { useQuery } from "convex/react";
import { Building2, FileText } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CompanyDocumentsTab } from "../components/crm/CompanyTabs";
import { EmptyState } from "../components/ui/EmptyState";
import { FullSpinner } from "../components/ui/Spinner";

/** Documents envoyés par le CRM aux entreprises clientes. */
export function Documents() {
  const companies = useQuery(api.bennespro.listCompanies);
  const [companyId, setCompanyId] = useState<Id<"bpCompanies"> | null>(null);
  if (companies === undefined) return <FullSpinner label="Chargement des entreprises…" />;
  if (companies.length === 0) return <EmptyState icon={<Building2 className="h-8 w-8" />} title="Aucune entreprise" description="Créez une entreprise avant de lui envoyer des documents." />;
  const selected = companies.find((company) => company._id === companyId) ?? null;
  return <div className="space-y-5">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[var(--foreground)]"><FileText className="h-6 w-6 text-brand-600" /> Documents</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Ajoutez des documents pour une entreprise. Ils seront disponibles dans son espace client et devront être consultés.</p></div>
    <label className="block max-w-lg text-sm font-semibold text-[var(--foreground)]">Entreprise<select value={companyId ?? ""} onChange={(event) => setCompanyId((event.target.value || null) as Id<"bpCompanies"> | null)} className="mt-1.5 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 font-normal outline-none focus:border-brand-500"><option value="">— Choisir une entreprise —</option>{companies.map((company) => <option key={company._id} value={company._id}>{company.name}{company.siret ? ` · ${company.siret}` : ""}</option>)}</select></label>
    {selected ? <CompanyDocumentsTab companyId={selected._id} /> : <EmptyState icon={<FileText className="h-8 w-8" />} title="Sélectionnez une entreprise" description="Choisissez le destinataire des documents à gérer." />}
  </div>;
}
