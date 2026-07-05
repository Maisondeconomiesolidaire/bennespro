import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Field, Input, Textarea } from "./ui/Field";
import { CompanyQrModal } from "./CompanyQrModal";

type Form = {
  name: string;
  siret: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

const EMPTY: Form = {
  name: "",
  siret: "",
  address: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
};

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

  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Entreprise fraîchement créée : on affiche son QR code généré automatiquement. */
  const [created, setCreated] = useState<{ _id: Id<"bpCompanies">; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (companyId && existing) {
      setForm({
        name: existing.name ?? "",
        siret: existing.siret ?? "",
        address: existing.address ?? "",
        contactName: existing.contactName ?? "",
        contactPhone: existing.contactPhone ?? "",
        contactEmail: existing.contactEmail ?? "",
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
        address: form.address.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
      };
      if (companyId) {
        await updateCompany({ companyId, ...payload });
      } else {
        const id = await createCompany(payload);
        onCreated?.(id);
        // QR code généré automatiquement pour la nouvelle entreprise.
        setCreated({ _id: id, name: payload.name });
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
      className="sm:h-auto sm:max-h-[85vh] sm:w-[560px]"
    >
      <div className="space-y-4">
        <Field label="Nom de l'entreprise" required>
          <Input value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Ex. BTP Méru SARL" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SIRET">
            <Input value={form.siret} onChange={(e) => set("siret")(e.target.value)} placeholder="123 456 789 00012" />
          </Field>
          <Field label="Téléphone">
            <Input value={form.contactPhone} onChange={(e) => set("contactPhone")(e.target.value)} placeholder="06 12 34 56 78" />
          </Field>
        </div>
        <Field label="Adresse">
          <Textarea value={form.address} onChange={(e) => set("address")(e.target.value)} placeholder="Adresse du siège" className="min-h-[70px]" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact (nom)">
            <Input value={form.contactName} onChange={(e) => set("contactName")(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail")(e.target.value)} />
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
    </Modal>
    </>
  );
}
