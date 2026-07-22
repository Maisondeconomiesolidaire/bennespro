import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Building2,
  Check,
  Clock,
  Download,
  FileText,
  MessageSquare,
  Plus,
  Send,
  Truck,
  Upload,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Field, Input } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullSpinner } from "../../components/ui/Spinner";
import { BillingBadge } from "../../components/ui/BillingBadge";
import { FileButton } from "../../components/ui/FileButton";
import { useToast } from "../../components/ui/Toast";
import { useUpload } from "../../lib/useUpload";
import { COMPANY_TYPE_OPTIONS, docTypeLabel, REQUIRED_DOCS, type CompanyType, type DocType } from "../../lib/companyProfile";
import { generateBonDepotPdf } from "../../lib/bonDepotPdf";
import { unitLabel } from "../../lib/materials";
import { cn } from "../../lib/cn";

const CARD = "rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6";

const TABS = [
  { to: "/compte", label: "Mon entreprise", icon: Building2, end: true },
  { to: "/compte/depots", label: "Mes dépôts", icon: Truck, end: false },
  { to: "/compte/documents", label: "Documents", icon: FileText, end: false },
  { to: "/compte/messagerie", label: "Messagerie", icon: MessageSquare, end: false },
];

/** Coquille de l'espace client avec les onglets. */
export function AccountLayout() {
  const claim = useMutation(api.bennespro.claimMyCompanyByEmail);

  // À l'arrivée : rattache automatiquement une entreprise existante (dépôts) via l'email.
  useEffect(() => {
    void claim({});
  }, [claim]);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-6">
      <h1 className="text-2xl font-black tracking-tight text-zinc-950">Mon espace client</h1>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p>
          Pour déclarer vos dépôts, utilisez l'application ValoDépôt pour tout type de dépôt.
        </p>
      </div>
      <RequiredActions />
      <nav className="mt-5 flex flex-wrap gap-2 border-b border-zinc-200 pb-px">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-t-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "border-b-2 border-brand-500 text-zinc-950"
                    : "text-zinc-500 hover:text-zinc-800",
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {t.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}

/** Bandeau « Actions requises » : signature des documents obligatoires. */
function RequiredActions() {
  const company = useQuery(api.bennespro.getMyCompany, {});
  const documents = useQuery(api.bennespro.listMyDocuments, company ? {} : "skip");
  const addDocument = useMutation(api.bennespro.addMyDocument);
  const upload = useUpload();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (!company || documents === undefined) return null;

  const statuses = REQUIRED_DOCS.map((req) => {
    const signed =
      req.type === "convention"
        ? company.conventionSignedAt !== undefined
        : company.protocoleSignedAt !== undefined;
    const uploaded = documents.some((d) => d.docType === req.type && d.uploadedByRole === "client");
    const status: "todo" | "pending" | "validated" = signed
      ? "validated"
      : uploaded
        ? "pending"
        : "todo";
    return { ...req, status };
  });

  if (statuses.every((s) => s.status === "validated")) return null;

  async function uploadSigned(type: DocType, file: File | null) {
    if (!file) return;
    setBusy(type);
    try {
      const storageId = await upload(file);
      await addDocument({ storageId, name: file.name, docType: type, mimeType: file.type || undefined });
      toast.success("Document transmis. En attente de validation.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5 rounded-3xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="text-sm font-bold">Actions requises</h2>
      </div>
      <p className="mt-1 text-sm text-amber-800/80">
        Pour chaque document : <strong>1.</strong> téléchargez-le, signez-le, puis{" "}
        <strong>2.</strong> importez la version signée.
      </p>
      <div className="mt-4 space-y-2.5">
        {statuses.map((s) => {
          const validated = s.status === "validated";
          const pending = s.status === "pending";
          return (
            <div key={s.type} className="rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-950">{s.label}</p>
                {validated ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                    <Check className="h-3.5 w-3.5" /> Validé
                  </span>
                ) : pending ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    <Clock className="h-3.5 w-3.5" /> En attente de validation
                  </span>
                ) : null}
              </div>

              {/* Deux actions distinctes, côte à côte : télécharger le vierge à
                  signer, puis importer la version signée. Le bouton d'import
                  reste proposé tant que ce n'est pas validé, pour permettre de
                  renvoyer une version corrigée. */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(s.template, "_blank", "noopener")}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" /> Télécharger le document
                </Button>

                {!validated ? (
                  <label
                    className={cn(
                      "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-[0_8px_18px_rgba(42,167,155,0.22)] transition hover:bg-brand-600 sm:w-auto",
                      "h-9",
                      busy === s.type && "pointer-events-none opacity-70",
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    {busy === s.type
                      ? "Envoi…"
                      : pending
                        ? "Réimporter le document signé"
                        : "Importer le document signé"}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      disabled={busy === s.type}
                      onChange={(e) => uploadSigned(s.type, e.target.files?.[0] ?? null)}
                    />
                  </label>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Invite à compléter le profil quand aucune entreprise n'est encore créée. */
function NeedsCompany() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={<Building2 className="h-8 w-8" />}
      title="Complétez d'abord votre entreprise"
      description="Renseignez les informations de votre entreprise pour accéder à cette section."
      action={<Button onClick={() => navigate("/compte")}>Renseigner mon entreprise</Button>}
    />
  );
}

/* ─── Onglet « Mon entreprise » ───────────────────────────────────────────── */

type InfoForm = {
  name: string;
  siret: string;
  companyType: CompanyType | "";
  companyTypeOther: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  contactName: string;
  billingEmail: string;
};

type VehicleForm = {
  label: string;
  plate: string;
};

const EMPTY_INFO: InfoForm = {
  name: "",
  siret: "",
  companyType: "",
  companyTypeOther: "",
  address: "",
  contactPhone: "",
  contactEmail: "",
  contactName: "",
  billingEmail: "",
};

const EMPTY_VEHICLE: VehicleForm = {
  label: "",
  plate: "",
};

export function AccountInfo() {
  const company = useQuery(api.bennespro.getMyCompany, {});
  const vehicles = useQuery(api.bennesproClientVehicles.listMyVehicles, company ? {} : "skip");
  const documents = useQuery(api.bennespro.listMyDocuments, company ? {} : "skip");
  const save = useMutation(api.bennespro.saveMyCompany);
  const addVehicle = useMutation(api.bennesproClientVehicles.addMyVehicle);
  const addDocument = useMutation(api.bennespro.addMyDocument);
  const upload = useUpload();
  const toast = useToast();

  const [form, setForm] = useState<InfoForm>(EMPTY_INFO);
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(EMPTY_VEHICLE);
  const [kbisFile, setKbisFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);

  useEffect(() => {
    if (!company) return;
    setForm({
      name: company.name ?? "",
      siret: company.siret ?? "",
      companyType: company.companyType ?? "",
      companyTypeOther: company.companyTypeOther ?? "",
      address: company.address ?? "",
      contactPhone: company.contactPhone ?? "",
      contactEmail: company.contactEmail ?? "",
      contactName: company.contactName ?? "",
      billingEmail: company.billingEmail ?? "",
    });
  }, [company]);

  const existingKbis = useMemo(
    () => (documents ?? []).filter((d) => d.docType === "kbis"),
    [documents],
  );

  function set<K extends keyof InfoForm>(key: K, value: InfoForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setVehicle<K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) {
    setVehicleForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Le nom de l'entreprise est obligatoire.");
      return;
    }
    setSaving(true);
    try {
      await save({
        name: form.name.trim(),
        siret: form.siret.trim() || undefined,
        companyType: form.companyType || undefined,
        companyTypeOther:
          form.companyType === "autre" ? form.companyTypeOther.trim() || undefined : undefined,
        address: form.address.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        billingEmail: form.billingEmail.trim() || undefined,
      });
      if (kbisFile) {
        const storageId = await upload(kbisFile);
        await addDocument({
          storageId,
          name: kbisFile.name,
          docType: "kbis",
          mimeType: kbisFile.type || undefined,
        });
        setKbisFile(null);
      }
      toast.success("Informations enregistrées.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function submitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company) {
      toast.error("Renseignez d'abord votre entreprise.");
      return;
    }
    if (!vehicleForm.label.trim()) {
      toast.error("Le nom du véhicule est obligatoire.");
      return;
    }
    setAddingVehicle(true);
    try {
      await addVehicle({
        label: vehicleForm.label.trim(),
        plate: vehicleForm.plate.trim() || undefined,
      });
      setVehicleForm(EMPTY_VEHICLE);
      toast.success("Véhicule ajouté.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ajout impossible.");
    } finally {
      setAddingVehicle(false);
    }
  }

  if (company === undefined) return <FullSpinner label="Chargement…" />;

  return (
    <form onSubmit={submit} className={cn(CARD, "space-y-5")}>
      {!company && (
        <p className="rounded-2xl bg-brand-500/10 px-4 py-3 text-sm font-medium text-brand-700">
          Bienvenue ! Renseignez les informations de votre entreprise pour finaliser votre inscription.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de l'entreprise" required>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex. Dupont BTP" />
        </Field>
        <Field label="SIRET">
          <Input value={form.siret} onChange={(e) => set("siret", e.target.value)} placeholder="123 456 789 00012" />
        </Field>
        <Field label="Profil">
          <Select<CompanyType>
            value={form.companyType}
            onChange={(v) => set("companyType", v)}
            options={COMPANY_TYPE_OPTIONS}
            placeholder="— Sélectionner —"
          />
        </Field>
        {form.companyType === "autre" ? (
          <Field label="Précisez">
            <Input
              value={form.companyTypeOther}
              onChange={(e) => set("companyTypeOther", e.target.value)}
              placeholder="Votre activité"
            />
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <div className="sm:col-span-2">
          <Field label="Adresse">
            <AddressAutocomplete
              value={form.address}
              onValueChange={(v) => set("address", v)}
              onSelect={(a) =>
                set("address", [a.address, `${a.postalCode} ${a.city}`.trim()].filter(Boolean).join(", "))
              }
              placeholder="12 rue des Artisans, 60000 Beauvais"
            />
          </Field>
        </div>
        <Field label="Téléphone">
          <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="06 12 34 56 78" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="contact@entreprise.fr" />
        </Field>
        <Field label="Nom et prénom du responsable">
          <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Marie Dupont" />
        </Field>
        <Field label="Email de facturation">
          <Input type="email" value={form.billingEmail} onChange={(e) => set("billingEmail", e.target.value)} placeholder="facturation@entreprise.fr" />
        </Field>
      </div>

      <Field label="KBIS ou avis de situation" hint="PDF ou image. Vous pourrez en ajouter d'autres depuis l'onglet Documents.">
        <FileButton onFile={setKbisFile} accept="application/pdf,image/*" selectedName={kbisFile?.name} />
        {existingKbis.length > 0 && (
          <p className="mt-2 text-xs text-zinc-500">
            {existingKbis.length} document(s) déjà transmis.
          </p>
        )}
      </Field>

      {company ? (
        <div className="space-y-4 rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-zinc-700" />
            <div>
              <h2 className="text-sm font-bold text-zinc-950">Mes véhicules</h2>
              <p className="text-xs text-zinc-500">
                Ajoutez les véhicules de votre entreprise pour les retrouver sur vos dépôts.
              </p>
            </div>
          </div>

          {vehicles === undefined ? (
            <FullSpinner label="Chargement des véhicules…" />
          ) : vehicles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
              Aucun véhicule enregistré pour le moment.
            </div>
          ) : (
            <div className="space-y-2">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">{vehicle.label}</p>
                    <p className="text-xs text-zinc-500">
                      {vehicle.plate?.trim() ? `Immatriculation : ${vehicle.plate}` : "Immatriculation non renseignée"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submitVehicle} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
            <Field label="Nom du véhicule" required>
              <Input
                value={vehicleForm.label}
                onChange={(e) => setVehicle("label", e.target.value)}
                placeholder="Ex. Camion benne 3,5T"
              />
            </Field>
            <Field label="Immatriculation">
              <Input
                value={vehicleForm.plate}
                onChange={(e) => setVehicle("plate", e.target.value.toUpperCase())}
                placeholder="AA-123-BB"
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={addingVehicle} className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                {addingVehicle ? "Ajout…" : "Ajouter"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

/* ─── Onglet « Mes dépôts » ───────────────────────────────────────────────── */

export function AccountDepots() {
  const company = useQuery(api.bennespro.getMyCompany, {});
  const depots = useQuery(api.bennespro.listMyDepots, company ? {} : "skip");
  const toast = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  if (company === undefined) return <FullSpinner label="Chargement…" />;
  if (!company) return <NeedsCompany />;
  if (depots === undefined) return <FullSpinner label="Chargement des dépôts…" />;

  if (depots.length === 0) {
    return (
      <EmptyState
        icon={<Truck className="h-8 w-8" />}
        title="Aucun dépôt pour le moment"
        description="Vos dépôts apparaîtront ici dès qu'ils seront enregistrés par notre équipe."
      />
    );
  }

  async function downloadBon(depot: NonNullable<typeof depots>[number]) {
    setDownloading(depot._id);
    try {
      await generateBonDepotPdf({
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
    } catch {
      toast.error("Impossible de générer le bon de dépôt.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-3">
      {depots.map((depot) => (
        <div key={depot._id} className={CARD}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-zinc-950">
                Dépôt n° {String(depot.depotNumber).padStart(4, "0")}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {new Date(depot.createdAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
                {depot.vehicle?.label ? ` · ${depot.vehicle.label}` : ""}
              </p>
            </div>
            {depot.billing ? (
              <BillingBadge status={depot.billing.status} paymentStatus={depot.billing.paymentStatus} />
            ) : null}
          </div>

          <ul className="mt-3 space-y-1 text-sm text-zinc-700">
            {depot.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{item.material}</span>
                <span className="shrink-0 text-zinc-500">
                  {item.quantity} {unitLabel(item.unit)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadBon(depot)}
              disabled={downloading === depot._id}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {downloading === depot._id ? "Génération…" : "Bon de dépôt"}
            </Button>
            {depot.billing?.stripeInvoiceUrl ? (
              <a
                href={depot.billing.stripeInvoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                <FileText className="h-4 w-4" />
                Facture DIB
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Onglet « Documents » ────────────────────────────────────────────────── */

export function AccountDocuments() {
  const company = useQuery(api.bennespro.getMyCompany, {});
  const documents = useQuery(api.bennespro.listMyDocuments, company ? {} : "skip");
  const addDocument = useMutation(api.bennespro.addMyDocument);
  const upload = useUpload();
  const toast = useToast();

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (company === undefined) return <FullSpinner label="Chargement…" />;
  if (!company) return <NeedsCompany />;

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const storageId = await upload(file);
      await addDocument({ storageId, name: file.name, docType: "autre", mimeType: file.type || undefined });
      toast.success("Document transmis.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-950">Mes documents</p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {uploading ? "Envoi…" : "Ajouter"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {documents === undefined ? (
        <FullSpinner label="Chargement des documents…" />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Aucun document"
          description="Les documents que vous transmettez et ceux que nous partageons apparaîtront ici."
        />
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <a
              key={doc._id}
              href={doc.url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className={cn(CARD, "flex items-center gap-3 !p-4 transition hover:bg-zinc-50")}
            >
              <FileText className="h-5 w-5 shrink-0 text-zinc-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-950">{doc.name}</p>
                <p className="text-xs text-zinc-500">
                  {docTypeLabel(doc.docType)} ·{" "}
                  {doc.uploadedByRole === "staff" ? "Partagé par Déchet'Lab" : "Transmis par vous"}
                </p>
              </div>
              <Download className="h-4 w-4 shrink-0 text-zinc-400" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Onglet « Messagerie » ───────────────────────────────────────────────── */

/** Pastille photo de profil (ou initiales) d'un expéditeur de message. */
function MessageAvatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-[11px] font-semibold text-white">
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

export function AccountMessages() {
  const company = useQuery(api.bennespro.getMyCompany, {});
  const messages = useQuery(api.bennespro.listMyMessages, company ? {} : "skip");
  const send = useMutation(api.bennespro.sendMyMessage);
  const markRead = useMutation(api.bennespro.markMyMessagesRead);
  const toast = useToast();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (company && messages && messages.length > 0) void markRead({});
  }, [company, messages, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  if (company === undefined) return <FullSpinner label="Chargement…" />;
  if (!company) return <NeedsCompany />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await send({ body: trimmed });
      setBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cn(CARD, "flex h-[60vh] flex-col !p-0")}>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages === undefined ? (
          <FullSpinner label="Chargement…" />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            Aucun message. Écrivez-nous, notre équipe vous répondra ici.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m._id}
              className={cn(
                "flex items-end gap-2",
                m.senderRole === "client" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <MessageAvatar name={m.senderName} imageUrl={m.senderImageUrl} />
              <div
                className={cn(
                  "flex min-w-0 max-w-[80%] flex-col",
                  m.senderRole === "client" ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-full rounded-2xl px-4 py-2.5 text-sm",
                    m.senderRole === "client"
                      ? "bg-brand-500 text-white"
                      : "bg-zinc-100 text-zinc-800",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
                <span className="mt-1 px-1 text-[11px] text-zinc-400">
                  {m.senderName} ·{" "}
                  {new Date(m.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-zinc-200 p-3">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Votre message…"
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
