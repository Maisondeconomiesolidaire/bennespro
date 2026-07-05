import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Download,
  Plus,
  ScanLine,
  Trash2,
  Truck,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useUpload } from "../lib/useUpload";
import { DIB_MATERIAL, MATERIALS, UNITS, unitLabel, type DepotItem, type Material, type Unit } from "../lib/materials";
import { generateBonDepotPdf, type BonDepotData } from "../lib/bonDepotPdf";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Field, Input, Textarea } from "./ui/Field";
import { Select } from "./ui/Select";
import { Spinner } from "./ui/Spinner";
import { SinglePhotoUpload } from "./ui/SinglePhotoUpload";
import { PhotoUpload } from "./ui/PhotoUpload";
import { SignaturePad } from "./SignaturePad";
import { CompanyModal } from "./CompanyModal";
import { QrScannerModal } from "./QrScannerModal";
import { cn } from "../lib/cn";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ["Entreprise", "Déchets", "Pièces jointes", "Signature", "Bon"];

/** Convertit une data URL en File pour l'upload Convex. */
async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type || "image/png" });
}

export function NewDepotWizard({
  open,
  onClose,
  initialCompanyId,
}: {
  open: boolean;
  onClose: () => void;
  /** Entreprise présélectionnée (ouverture via QR code scanné). */
  initialCompanyId?: Id<"bpCompanies"> | null;
}) {
  const companies = useQuery(api.bennespro.listCompanies) ?? [];
  const createDepot = useMutation(api.bennespro.createDepot);
  const addVehicle = useMutation(api.bennespro.addVehicle);
  const upload = useUpload();

  const [step, setStep] = useState<Step>(1);

  // Étape 1
  const [companyId, setCompanyId] = useState<Id<"bpCompanies"> | "">("");
  const [vehicleId, setVehicleId] = useState<Id<"bpVehicles"> | "">("");
  const [depositorName, setDepositorName] = useState("");
  const [siteRef, setSiteRef] = useState("");
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [newVehicleLabel, setNewVehicleLabel] = useState("");
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [addingVehicle, setAddingVehicle] = useState(false);

  // Présélection de l'entreprise quand le wizard est ouvert via un QR code.
  useEffect(() => {
    if (open && initialCompanyId) {
      setCompanyId(initialCompanyId);
      setVehicleId("");
    }
  }, [open, initialCompanyId]);

  const vehicles = useQuery(
    api.bennespro.listVehicles,
    companyId ? { companyId } : "skip",
  );

  // Étape 2
  const [items, setItems] = useState<DepotItem[]>([]);

  // Étape 3
  const [ticketPhoto, setTicketPhoto] = useState<Id<"_storage"> | null>(null);
  const [truckExteriorPhoto, setTruckExteriorPhoto] = useState<Id<"_storage"> | null>(null);
  const [truckInteriorPhoto, setTruckInteriorPhoto] = useState<Id<"_storage"> | null>(null);
  const [attachments, setAttachments] = useState<Id<"_storage">[]>([]);
  const [comment, setComment] = useState("");

  // Étape 4
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 5 (résultat)
  const [saved, setSaved] = useState<BonDepotData | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const company = useMemo(
    () => companies.find((c) => c._id === companyId) ?? null,
    [companies, companyId],
  );
  const vehicle = useMemo(
    () => (vehicles ?? []).find((v) => v._id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );

  function resetAndClose() {
    setStep(1);
    setCompanyId("");
    setVehicleId("");
    setDepositorName("");
    setSiteRef("");
    setItems([]);
    setTicketPhoto(null);
    setTruckExteriorPhoto(null);
    setTruckInteriorPhoto(null);
    setAttachments([]);
    setComment("");
    setSignature(null);
    setError(null);
    setSaved(null);
    onClose();
  }

  async function handleAddVehicle() {
    if (!companyId || !newVehicleLabel.trim()) return;
    setAddingVehicle(true);
    try {
      const id = await addVehicle({
        companyId,
        label: newVehicleLabel.trim(),
        plate: newVehiclePlate.trim() || undefined,
      });
      setVehicleId(id);
      setNewVehicleLabel("");
      setNewVehiclePlate("");
    } finally {
      setAddingVehicle(false);
    }
  }

  function addMaterial(material: Material) {
    setItems((prev) => [...prev, { material, unit: "kg", quantity: 0, siteRef: siteRef.trim() }]);
  }
  function patchItem(index: number, patch: Partial<DepotItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const step1Valid = Boolean(companyId && vehicleId && depositorName.trim() && siteRef.trim());
  const step2Valid = items.length > 0 && items.every((it) => it.quantity > 0);

  async function handleSubmit() {
    if (!companyId || !vehicleId || !signature) return;
    setSubmitting(true);
    setError(null);
    try {
      const sigFile = await dataUrlToFile(signature, "signature.png");
      const signatureId = await upload(sigFile);
      const { depotNumber } = await createDepot({
        companyId,
        vehicleId,
        depositorName: depositorName.trim(),
        siteRef: siteRef.trim(),
        items,
        ticketPhoto: ticketPhoto ?? undefined,
        truckExteriorPhoto: truckExteriorPhoto ?? undefined,
        truckInteriorPhoto: truckInteriorPhoto ?? undefined,
        attachments,
        comment: comment.trim() || undefined,
        signature: signatureId,
      });
      setSaved({
        depotNumber,
        createdAt: Date.now(),
        depositorName: depositorName.trim(),
        siteRef: siteRef.trim(),
        items,
        comment: comment.trim() || undefined,
        company,
        vehicle,
        signatureUrl: signature,
      });
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement du dépôt.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadPdf() {
    if (!saved) return;
    setPdfBusy(true);
    try {
      await generateBonDepotPdf(saved);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Nouveau dépôt">
      {/* Fil d'étapes */}
      <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as Step;
          const active = n === step;
          const done = n < step;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  active
                    ? "bg-brand-500 text-white"
                    : done
                      ? "bg-brand-100 text-brand-700"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={cn("font-medium", active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 ? <span className="mx-1 text-[var(--muted-foreground)]">›</span> : null}
            </div>
          );
        })}
      </div>

      {/* ── Étape 1 : Entreprise & véhicule ───────────────────────────────── */}
      {step === 1 ? (
        <div className="space-y-4">
          <Field label="Entreprise" required>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1">
                <Select
                  value={companyId}
                  onChange={(id) => {
                    setCompanyId(id);
                    setVehicleId("");
                  }}
                  options={companies.map((c) => ({
                    value: c._id,
                    label: c.name,
                    description: c.siret ? `SIRET ${c.siret}` : undefined,
                  }))}
                  placeholder="— Sélectionner une entreprise —"
                  searchable
                  searchPlaceholder="Rechercher une entreprise…"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setScannerOpen(true)}>
                  <ScanLine className="h-4 w-4" /> Scannez
                </Button>
                <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setCompanyModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Nouvelle
                </Button>
              </div>
            </div>
          </Field>

          {companyId ? (
            <Field label="Véhicule" required>
              <Select
                value={vehicleId}
                onChange={(id) => setVehicleId(id)}
                options={(vehicles ?? []).map((v) => ({
                  value: v._id,
                  label: v.label,
                  description: v.plate,
                  icon: <Truck className="h-4 w-4 shrink-0 text-brand-500" />,
                }))}
                placeholder="— Sélectionner un véhicule —"
              />
              <div className="mt-2 flex flex-col gap-2 rounded-lg border border-dashed border-[var(--border)] p-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Ajouter un véhicule</label>
                  <Input value={newVehicleLabel} onChange={(e) => setNewVehicleLabel(e.target.value)} placeholder="Ex. Benne 20 m³" />
                </div>
                <div className="sm:w-40">
                  <Input value={newVehiclePlate} onChange={(e) => setNewVehiclePlate(e.target.value)} placeholder="AB-123-CD" />
                </div>
                <Button type="button" variant="secondary" onClick={handleAddVehicle} disabled={!newVehicleLabel.trim() || addingVehicle}>
                  {addingVehicle ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Ajouter
                </Button>
              </div>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet du déposant" required>
              <Input value={depositorName} onChange={(e) => setDepositorName(e.target.value)} placeholder="Prénom Nom" />
            </Field>
            <Field label="Référence chantier" required hint="Réf. par défaut des déchets (modifiable par ligne).">
              <Input value={siteRef} onChange={(e) => setSiteRef(e.target.value)} placeholder="Ex. Crèche de Méru" />
            </Field>
          </div>
        </div>
      ) : null}

      {/* ── Étape 2 : Déchets ─────────────────────────────────────────────── */}
      {step === 2 ? (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Sélectionnez les matériaux déposés</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MATERIALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => addMaterial(m)}
                  className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-center text-sm font-medium text-[var(--foreground)] transition hover:border-brand-400 hover:bg-[var(--accent)]"
                >
                  {m}
                  {m === DIB_MATERIAL ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Facturé au kg
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Seul le tout-venant / DIB non triés est facturé (au poids). Les autres flux sont gratuits.
            </p>
          </div>

          {items.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--foreground)]">Déchets ajoutés ({items.length})</p>
              {items.map((it, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                  <div className="min-w-[140px] flex-1">
                    <span className="mb-1 block text-xs text-[var(--muted-foreground)]">Matériau</span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">{it.material}</span>
                  </div>
                  <div className="w-24">
                    <label className="mb-1 block text-xs text-[var(--muted-foreground)]">Quantité</label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={it.quantity || ""}
                      onChange={(e) => patchItem(i, { quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-xs text-[var(--muted-foreground)]">Unité</label>
                    <Select
                      value={it.unit}
                      onChange={(unit) => patchItem(i, { unit: unit as Unit })}
                      options={UNITS.map((u) => ({ value: u.value, label: u.label }))}
                    />
                  </div>
                  <div className="min-w-[120px] flex-1">
                    <label className="mb-1 block text-xs text-[var(--muted-foreground)]">Réf. chantier</label>
                    <Input value={it.siteRef} onChange={(e) => patchItem(i, { siteRef: e.target.value })} />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} aria-label="Retirer">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">Aucun déchet ajouté pour l'instant.</p>
          )}
        </div>
      ) : null}

      {/* ── Étape 3 : Pièces jointes ──────────────────────────────────────── */}
      {step === 3 ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Photo du ticket">
              <SinglePhotoUpload value={ticketPhoto} onChange={setTicketPhoto} />
            </Field>
            <Field label="Extérieur du camion">
              <SinglePhotoUpload value={truckExteriorPhoto} onChange={setTruckExteriorPhoto} />
            </Field>
            <Field label="Intérieur du camion">
              <SinglePhotoUpload value={truckInteriorPhoto} onChange={setTruckInteriorPhoto} />
            </Field>
          </div>
          <Field label="Autres pièces jointes">
            <PhotoUpload value={attachments} onChange={setAttachments} />
          </Field>
          <Field label="Commentaire (facultatif)">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Observations éventuelles…" />
          </Field>
        </div>
      ) : null}

      {/* ── Étape 4 : Récap + signature ───────────────────────────────────── */}
      {step === 4 ? (
        <div className="space-y-5">
          <RecapBlock
            companyName={company?.name ?? "—"}
            vehicleLabel={vehicle?.label ?? "—"}
            depositorName={depositorName}
            siteRef={siteRef}
            items={items}
          />
          <Field label="Signature du déposant" required>
            <SignaturePad onChange={setSignature} />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {/* ── Étape 5 : Confirmation ────────────────────────────────────────── */}
      {step === 5 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <Check className="h-7 w-7" />
          </span>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Dépôt enregistré</h3>
          <p className="mt-1 max-w-md text-sm text-[var(--muted-foreground)]">
            Le dépôt a bien été enregistré. Vous pouvez générer le bon de dépôt au format PDF.
          </p>
          {saved?.items.some((it) => it.material === DIB_MATERIAL) ? (
            <p className="mt-2 max-w-md rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
              Ce dépôt contient du DIB : la facture Stripe est émise automatiquement (suivi dans l'onglet
              « DIB & facturation »).
            </p>
          ) : null}
          <div className="mt-6 flex gap-2">
            <Button onClick={handleDownloadPdf} disabled={pdfBusy}>
              {pdfBusy ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Télécharger le bon (PDF)
            </Button>
            <Button variant="secondary" onClick={resetAndClose}>Fermer</Button>
          </div>
        </div>
      ) : null}

      {/* ── Barre de navigation ───────────────────────────────────────────── */}
      {step < 5 ? (
        <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <Button variant="ghost" onClick={() => (step === 1 ? resetAndClose() : setStep((s) => (s - 1) as Step))} disabled={submitting}>
            <ArrowLeft className="h-4 w-4" /> {step === 1 ? "Annuler" : "Précédent"}
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            >
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!signature || submitting}>
              {submitting ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Valider le dépôt
            </Button>
          )}
        </div>
      ) : null}

      <CompanyModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        onCreated={(id) => {
          setCompanyId(id);
          setVehicleId("");
        }}
      />

      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(id) => {
          setCompanyId(id);
          setVehicleId("");
          setScannerOpen(false);
        }}
      />
    </Modal>
  );
}

function RecapBlock({
  companyName,
  vehicleLabel,
  depositorName,
  siteRef,
  items,
}: {
  companyName: string;
  vehicleLabel: string;
  depositorName: string;
  siteRef: string;
  items: DepotItem[];
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <RecapLine icon={<Building2 className="h-4 w-4" />} label="Entreprise" value={companyName} />
        <RecapLine icon={<Truck className="h-4 w-4" />} label="Véhicule" value={vehicleLabel} />
        <RecapLine label="Déposant" value={depositorName} />
        <RecapLine label="Réf. chantier" value={siteRef} />
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)] text-left text-xs text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2">Matériau</th>
              <th className="px-3 py-2">Quantité</th>
              <th className="px-3 py-2">Réf. chantier</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-medium text-[var(--foreground)]">{it.material}</td>
                <td className="px-3 py-2">{it.quantity} {unitLabel(it.unit)}</td>
                <td className="px-3 py-2 text-[var(--muted-foreground)]">{it.siteRef || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecapLine({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {icon ? <span className="mt-0.5 text-brand-500">{icon}</span> : null}
      <div>
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--foreground)]">{value}</p>
      </div>
    </div>
  );
}
