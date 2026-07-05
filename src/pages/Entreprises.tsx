import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Building2, Pencil, Plus, QrCode, Trash2, Truck } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAppActions } from "../lib/appActions";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { FullSpinner } from "../components/ui/Spinner";
import { Modal } from "../components/ui/Modal";
import { CompanyQrModal } from "../components/CompanyQrModal";
import type { Doc } from "../../convex/_generated/dataModel";

export function Entreprises() {
  const { openCompany } = useAppActions();
  const companies = useQuery(api.bennespro.listCompanies);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Id<"bpCompanies"> | null>(null);
  const [qrCompany, setQrCompany] = useState<(Pick<Doc<"bpCompanies">, "_id" | "name"> & { siret?: string }) | null>(null);

  const filtered = (companies ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Entreprises</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Entreprises déposantes et leurs véhicules.</p>
        </div>
        <Button onClick={() => openCompany()}>
          <Plus className="h-4 w-4" /> Nouvelle entreprise
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher une entreprise…"
        className="max-w-sm"
      />

      {companies === undefined ? (
        <FullSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title={search ? "Aucun résultat" : "Aucune entreprise"}
          description={search ? "Aucune entreprise ne correspond à votre recherche." : "Ajoutez une première entreprise pour commencer."}
          action={!search ? <Button onClick={() => openCompany()}><Plus className="h-4 w-4" /> Nouvelle entreprise</Button> : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c._id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(c._id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelected(c._id);
              }}
              className="glass-card group relative flex cursor-pointer flex-col items-start rounded-xl border border-[var(--border)] p-4 text-left transition hover:border-brand-400 hover:shadow-[var(--shadow-strong)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <Building2 className="h-5 w-5" />
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQrCompany({ _id: c._id, name: c.name, siret: c.siret });
                }}
                title="QR code de l'entreprise (étiquette Brother QL-500)"
                aria-label="QR code de l'entreprise"
                className="absolute right-3 top-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--muted-foreground)] transition hover:border-brand-400 hover:text-brand-600"
              >
                <QrCode className="h-4 w-4" />
              </button>
              <p className="mt-3 font-semibold text-[var(--foreground)]">{c.name}</p>
              {c.siret ? <p className="text-xs text-[var(--muted-foreground)]">SIRET {c.siret}</p> : null}
              {c.contactPhone ? <p className="text-xs text-[var(--muted-foreground)]">{c.contactPhone}</p> : null}
            </div>
          ))}
        </div>
      )}

      <CompanyDetailModal
        companyId={selected}
        onClose={() => setSelected(null)}
        onEdit={(id) => { setSelected(null); openCompany(id); }}
        onShowQr={(company) => { setSelected(null); setQrCompany(company); }}
      />
      <CompanyQrModal company={qrCompany} onClose={() => setQrCompany(null)} />
    </div>
  );
}

function CompanyDetailModal({
  companyId,
  onClose,
  onEdit,
  onShowQr,
}: {
  companyId: Id<"bpCompanies"> | null;
  onClose: () => void;
  onEdit: (id: Id<"bpCompanies">) => void;
  onShowQr: (company: Pick<Doc<"bpCompanies">, "_id" | "name"> & { siret?: string }) => void;
}) {
  const company = useQuery(api.bennespro.getCompany, companyId ? { companyId } : "skip");
  const addVehicle = useMutation(api.bennespro.addVehicle);
  const updateVehicle = useMutation(api.bennespro.updateVehicle);
  const removeVehicle = useMutation(api.bennespro.removeVehicle);

  const [label, setLabel] = useState("");
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<Id<"bpVehicles"> | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPlate, setEditPlate] = useState("");

  async function handleAdd() {
    if (!companyId || !label.trim()) return;
    setBusy(true);
    try {
      await addVehicle({ companyId, label: label.trim(), plate: plate.trim() || undefined });
      setLabel("");
      setPlate("");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(vehicleId: Id<"bpVehicles">) {
    if (!editLabel.trim()) return;
    await updateVehicle({ vehicleId, label: editLabel.trim(), plate: editPlate.trim() || undefined });
    setEditId(null);
  }

  return (
    <Modal
      open={companyId !== null}
      onClose={onClose}
      title={company?.name ?? "Entreprise"}
      className="sm:h-auto sm:max-h-[85vh] sm:w-[600px]"
    >
      {company === undefined ? (
        <FullSpinner />
      ) : company === null ? (
        <p className="text-sm text-[var(--muted-foreground)]">Entreprise introuvable.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="grid flex-1 gap-2 text-sm sm:grid-cols-2">
              <Detail label="SIRET" value={company.siret} />
              <Detail label="Téléphone" value={company.contactPhone} />
              <Detail label="Contact" value={company.contactName} />
              <Detail label="Email" value={company.contactEmail} />
              <Detail label="Adresse" value={company.address} full />
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button variant="secondary" size="sm" onClick={() => onEdit(company._id)}>
                <Pencil className="h-4 w-4" /> Modifier
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onShowQr({ _id: company._id, name: company.name, siret: company.siret })}>
                <QrCode className="h-4 w-4" /> QR code
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Truck className="h-4 w-4 text-brand-500" /> Véhicules ({company.vehicles.length})
            </p>
            <div className="space-y-2">
              {company.vehicles.map((v) => (
                <div key={v._id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2.5">
                  {editId === v._id ? (
                    <>
                      <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-9 flex-1" />
                      <Input value={editPlate} onChange={(e) => setEditPlate(e.target.value)} placeholder="Plaque" className="h-9 w-32" />
                      <Button size="sm" onClick={() => handleSaveEdit(v._id)}>Enregistrer</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Annuler</Button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">{v.label}</p>
                        {v.plate ? <p className="text-xs text-[var(--muted-foreground)]">{v.plate}</p> : null}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => { setEditId(v._id); setEditLabel(v.label); setEditPlate(v.plate ?? ""); }} aria-label="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void removeVehicle({ vehicleId: v._id })} aria-label="Supprimer">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {company.vehicles.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">Aucun véhicule enregistré.</p>
              ) : null}
            </div>

            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-dashed border-[var(--border)] p-3 sm:flex-row sm:items-center">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Benne 20 m³" className="h-9 flex-1" />
              <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="AB-123-CD" className="h-9 sm:w-36" />
              <Button size="sm" onClick={handleAdd} disabled={!label.trim() || busy}>
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Detail({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="font-medium text-[var(--foreground)]">{value || "—"}</p>
    </div>
  );
}
