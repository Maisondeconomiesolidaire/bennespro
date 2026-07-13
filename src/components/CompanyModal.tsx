import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, Building2, Check, Download, FileText, MessageSquare, Send, Trash2, Upload } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Field, Input, Textarea } from "./ui/Field";
import { Select } from "./ui/Select";
import { UnderlineTabs } from "./ui/UnderlineTabs";
import { FullSpinner } from "./ui/Spinner";
import { useToast } from "./ui/Toast";
import { useUpload } from "../lib/useUpload";
import {
  COMPANY_TYPE_OPTIONS,
  DOC_TYPE_OPTIONS,
  docTypeLabel,
  type CompanyType,
  type DocType,
} from "../lib/companyProfile";
import { cn } from "../lib/cn";
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
      className="sm:h-auto sm:max-h-[85vh] sm:w-[560px]"
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

/* ─── Onglet Documents (staff) ────────────────────────────────────────────── */

function CompanyDocumentsTab({ companyId }: { companyId: Id<"bpCompanies"> }) {
  const documents = useQuery(api.bennespro.listCompanyDocuments, { companyId });
  const addDoc = useMutation(api.bennespro.addCompanyDocument);
  const removeDoc = useMutation(api.bennespro.removeCompanyDocument);
  const validateDoc = useMutation(api.bennespro.validateCompanyDocument);
  const upload = useUpload();
  const toast = useToast();
  const [docType, setDocType] = useState<DocType>("autre");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast.error("Sélectionnez un fichier.");
      return;
    }
    setUploading(true);
    try {
      const storageId = await upload(file);
      await addDoc({ companyId, storageId, name: file.name, docType, mimeType: file.type || undefined });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Document partagé avec le client.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-[var(--border)] p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <Select<DocType> value={docType} onChange={setDocType} options={DOC_TYPE_OPTIONS} />
          </Field>
          <Field label="Fichier">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[var(--muted-foreground)] file:mr-3 file:rounded-full file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600"
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={uploading}>
            <Upload className="mr-1.5 h-4 w-4" />
            {uploading ? "Envoi…" : "Partager au client"}
          </Button>
        </div>
      </form>

      {documents === undefined ? (
        <FullSpinner label="Chargement…" />
      ) : documents.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">Aucun document.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc._id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3">
              <FileText className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{doc.name}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <span>
                    {docTypeLabel(doc.docType)} ·{" "}
                    {doc.uploadedByRole === "client" ? "Transmis par le client" : "Partagé par vous"}
                  </span>
                  {doc.validated ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 font-semibold text-brand-700">
                      <BadgeCheck className="h-3 w-3" /> Validé
                    </span>
                  ) : doc.uploadedByRole === "client" ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                      En attente de validation
                    </span>
                  ) : null}
                </p>
              </div>
              {doc.uploadedByRole === "client" ? (
                <button
                  type="button"
                  onClick={() => void validateDoc({ documentId: doc._id, validated: !doc.validated })}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                    doc.validated
                      ? "text-brand-600 hover:bg-brand-50"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
                  )}
                  title={doc.validated ? "Annuler la validation" : "Marquer comme validé"}
                >
                  <Check className="h-4 w-4" />
                </button>
              ) : null}
              <a
                href={doc.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                title="Télécharger"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => void removeDoc({ documentId: doc._id })}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Onglet Messagerie (staff) ───────────────────────────────────────────── */

function CompanyMessagesTab({ companyId }: { companyId: Id<"bpCompanies"> }) {
  const messages = useQuery(api.bennespro.listCompanyMessages, { companyId });
  const send = useMutation(api.bennespro.sendCompanyMessage);
  const markRead = useMutation(api.bennespro.markCompanyMessagesRead);
  const toast = useToast();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages && messages.length > 0) void markRead({ companyId });
  }, [messages, markRead, companyId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await send({ companyId, body: trimmed });
      setBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[52vh] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages === undefined ? (
          <FullSpinner label="Chargement…" />
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            Aucun message avec ce client.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m._id} className={cn("flex flex-col", m.senderRole === "staff" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  m.senderRole === "staff" ? "bg-brand-500 text-white" : "bg-[var(--accent)] text-[var(--foreground)]",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
              <span className="mt-1 px-1 text-[11px] text-[var(--muted-foreground)]">
                {m.senderName} ·{" "}
                {new Date(m.createdAt).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Répondre au client…" className="flex-1" />
        <Button type="submit" disabled={sending || !body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
