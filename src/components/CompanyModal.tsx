import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Building2, FileText, MessageSquare } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Field, Input, Textarea } from "./ui/Field";
import { Select } from "./ui/Select";
import { UnderlineTabs } from "./ui/UnderlineTabs";
import { COMPANY_TYPE_OPTIONS, type CompanyType } from "../lib/companyProfile";
import { CompanyDocumentsTab, CompanyMessagesTab } from "./crm/CompanyTabs";
import { CompanyQrModal } from "./CompanyQrModal";

type Form = {
  name: string;
  siret: string;
  companyType: CompanyType | "";
  companyTypeOther: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  billingEmail: string;
};

const EMPTY: Form = {
  name: "",
  siret: "",
  companyType: "",
  companyTypeOther: "",
  address: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  billingEmail: "",
};

type Tab = "infos" | "documents" | "messagerie";

/**
 * Création / édition d'une entreprise. `companyId` non défini → création.
 * `onCreated` renvoie l'id créé (utile pour la sélection dans le wizard).
 */
export function CompanyModal({
  open,
  onClose,
  companyId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  companyId?: Id<"bpCompanies">;
  onCreated?: (id: Id<"bpCompanies">) => void;
}) {
  const existing = useQuery(
    api.bennespro.getCompany,
    open && companyId ? { companyId } : "skip",
  );
  const createCompany = useMutation(api.bennespro.createCompany);
  const updateCompany = useMutation(api.bennespro.updateCompany);

  const [tab, setTab] = useState<Tab>("infos");
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Entreprise fraîchement créée : on affiche son QR code généré automatiquement. */
  const [created, setCreated] = useState<{ _id: Id<"bpCompanies">; name: string; siret?: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab("infos");
    if (companyId && existing) {
      setForm({
        name: existing.name ?? "",
        siret: existing.siret ?? "",
        companyType: existing.companyType ?? "",
        companyTypeOther: existing.companyTypeOther ?? "",
        address: existing.address ?? "",
        contactName: existing.contactName ?? "",
        contactPhone: existing.contactPhone ?? "",
        contactEmail: existing.contactEmail ?? "",
        billingEmail: existing.billingEmail ?? "",
      });
    } else if (!companyId) {
      setForm(EMPTY);
    }
  }, [open, companyId, existing]);

  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Le nom de l'entreprise est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        siret: form.siret.trim() || undefined,
        companyType: form.companyType || undefined,
        companyTypeOther:
          form.companyType === "autre" ? form.companyTypeOther.trim() || undefined : undefined,
        address: form.address.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        billingEmail: form.billingEmail.trim() || undefined,
      };
      if (companyId) {
        await updateCompany({ companyId, ...payload });
      } else {
        const id = await createCompany(payload);
        onCreated?.(id);
        // QR code généré automatiquement pour la nouvelle entreprise.
        setCreated({ _id: id, name: payload.name, siret: payload.siret });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <CompanyQrModal company={created} justCreated onClose={() => setCreated(null)} />
    <Modal
      open={open}
      onClose={onClose}
      title={companyId ? "Modifier l'entreprise" : "Nouvelle entreprise"}
    >
      {companyId ? (
        <UnderlineTabs<Tab>
          className="mb-4"
          value={tab}
          onChange={setTab}
          items={[
            { key: "infos", label: "Infos", icon: Building2 },
            { key: "documents", label: "Documents", icon: FileText },
            { key: "messagerie", label: "Messagerie", icon: MessageSquare },
          ]}
        />
      ) : null}

      {tab === "documents" && companyId ? (
        <CompanyDocumentsTab companyId={companyId} />
      ) : tab === "messagerie" && companyId ? (
        <CompanyMessagesTab companyId={companyId} />
      ) : (
        <div className="space-y-4">
          {existing?.ownerUserId ? (
            <p className="rounded-xl bg-brand-100 px-3 py-2 text-xs font-semibold text-brand-700">
              Compte client actif — cette entreprise gère son espace en ligne.
            </p>
          ) : null}
          <Field label="Nom de l'entreprise" required>
            <Input value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Ex. BTP Méru SARL" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SIRET">
              <Input value={form.siret} onChange={(e) => set("siret")(e.target.value)} placeholder="123 456 789 00012" />
            </Field>
            <Field label="Profil">
              <Select<CompanyType>
                value={form.companyType}
                onChange={(v) => set("companyType")(v)}
                options={COMPANY_TYPE_OPTIONS}
                placeholder="— Sélectionner —"
              />
            </Field>
          </div>
          {form.companyType === "autre" ? (
            <Field label="Précisez le profil">
              <Input value={form.companyTypeOther} onChange={(e) => set("companyTypeOther")(e.target.value)} placeholder="Activité" />
            </Field>
          ) : null}
          <Field label="Adresse">
            <Textarea value={form.address} onChange={(e) => set("address")(e.target.value)} placeholder="Adresse du siège" className="min-h-[70px]" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact (nom)">
              <Input value={form.contactName} onChange={(e) => set("contactName")(e.target.value)} />
            </Field>
            <Field label="Téléphone">
              <Input value={form.contactPhone} onChange={(e) => set("contactPhone")(e.target.value)} placeholder="06 12 34 56 78" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail")(e.target.value)} />
            </Field>
            <Field label="Email de facturation">
              <Input type="email" value={form.billingEmail} onChange={(e) => set("billingEmail")(e.target.value)} />
            </Field>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement…" : companyId ? "Enregistrer" : "Créer l'entreprise"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
    </>
  );
}
