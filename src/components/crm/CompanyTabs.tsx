import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, Clock, Download, Eye, FileText, Send, Share2, ShieldAlert, Trash2, Upload } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Field } from "../ui/Field";
import { Input } from "../ui/Field";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { FileButton } from "../ui/FileButton";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { FullSpinner } from "../ui/Spinner";
import { useToast } from "../ui/Toast";
import { useUpload } from "../../lib/useUpload";
import { REQUIRED_DOCS, type DocType } from "../../lib/companyProfile";
import { cn } from "../../lib/cn";

type CompanyDocument = {
  _id: Id<"bpCompanyDocuments">;
  name: string;
  docType: DocType;
  note: string | null;
  uploadedByRole: "client" | "staff";
  sharedWithClientAt: number | null;
  url: string | null;
};

type ComplianceStatus = "validated" | "pending" | "missing";

function StatusChip({ status }: { status: ComplianceStatus }) {
  const map = {
    validated: { style: "bg-brand-100 text-brand-700", Icon: BadgeCheck, label: "Signé" },
    pending: { style: "bg-amber-100 text-amber-700", Icon: Clock, label: "Reçu, à valider" },
    missing: { style: "bg-red-100 text-red-600", Icon: ShieldAlert, label: "Manquant" },
  } as const;
  const { style, Icon, label } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", style)}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

/* ─── Onglet Documents (staff) ────────────────────────────────────────────── */

export function CompanyDocumentsTab({ companyId }: { companyId: Id<"bpCompanies"> }) {
  const documents = useQuery(api.bennespro.listCompanyDocuments, { companyId });
  const compliance = useQuery(api.bennespro.companyComplianceState, { companyId });
  const addDoc = useMutation(api.bennespro.addCompanyDocument);
  const removeDoc = useMutation(api.bennespro.removeCompanyDocument);
  const setSigned = useMutation(api.bennespro.setComplianceSigned);
  const shareDoc = useMutation(api.bennespro.shareCompanyDocument);
  const upload = useUpload();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyType, setBusyType] = useState<DocType | null>(null);
  const [shareTarget, setShareTarget] = useState<CompanyDocument | null>(null);
  const [sharing, setSharing] = useState(false);

  async function confirmShare() {
    if (!shareTarget) return;
    setSharing(true);
    try {
      await shareDoc({ documentId: shareTarget._id, shared: true });
      toast.success("Document partagé avec le client.");
      setShareTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Partage impossible.");
    } finally {
      setSharing(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast.error("Sélectionnez un fichier.");
      return;
    }
    setUploading(true);
    try {
      const storageId = await upload(file);
      await addDoc({ companyId, storageId, name: file.name, note: note.trim() || undefined, mimeType: file.type || undefined });
      setFile(null);
      setNote("");
      toast.success("Document ajouté (non partagé). Utilisez « Partager au client » pour le rendre visible.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function importSigned(type: DocType, f: File | null) {
    if (!f) return;
    setBusyType(type);
    try {
      const storageId = await upload(f);
      await addDoc({ companyId, storageId, name: f.name, docType: type, mimeType: f.type || undefined });
      toast.success("Document signé importé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusyType(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Conformité : convention & protocole signés. */}
      <div className="space-y-2.5 rounded-xl border border-[var(--border)] p-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Documents obligatoires</p>
        {REQUIRED_DOCS.map((req) => {
          const status = (req.type === "convention" ? compliance?.convention : compliance?.protocole) ?? "missing";
          const signed = req.type === "convention" ? compliance?.conventionSigned : compliance?.protocoleSigned;
          const typeDocs = (documents ?? []).filter((d) => d.docType === req.type);
          return (
            <div key={req.type} className="space-y-2 rounded-lg bg-[var(--card)] p-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">{req.label}</span>
                  <StatusChip status={status} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <FileButton
                    onFile={(f) => importSigned(req.type, f)}
                    accept="application/pdf,image/*"
                    disabled={busyType === req.type}
                    label={busyType === req.type ? "Import…" : "Importer le signé"}
                  />
                  <Checkbox
                    checked={!!signed}
                    onChange={(v) => void setSigned({ companyId, type: req.type as "convention" | "protocole", signed: v })}
                    label="Signé"
                  />
                </div>
              </div>
              {/* Documents déposés (client ou staff) : à ouvrir pour vérifier avant de valider. */}
              {typeDocs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {typeDocs.map((d) => (
                    <a
                      key={d._id}
                      href={d.url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--accent)]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span className="max-w-[160px] truncate">{d.name}</span>
                      <span className="text-[var(--muted-foreground)]">
                        · {d.uploadedByRole === "client" ? "client" : "staff"}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">Aucun document déposé pour l'instant.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Ajout d'un document libre (avec message de contexte optionnel). */}
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-[var(--border)] p-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Ajouter un document</p>
        <Field label="Fichier">
          <FileButton onFile={setFile} accept="application/pdf,image/*" selectedName={file?.name} />
        </Field>
        <Field label="Message (optionnel)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contexte du document…" />
        </Field>
        <p className="text-xs text-[var(--muted-foreground)]">
          Le document n'est pas visible par le client tant qu'il n'est pas partagé.
        </p>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={uploading}>
            <Upload className="mr-1.5 h-4 w-4" />
            {uploading ? "Envoi…" : "Ajouter"}
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
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-[var(--foreground)]">{doc.name}</span>
                  {doc.uploadedByRole === "staff" ? (
                    doc.sharedWithClientAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        <BadgeCheck className="h-3 w-3" /> Partagé
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]">
                        Non partagé
                      </span>
                    )
                  ) : null}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {doc.uploadedByRole === "client" ? "Transmis par le client" : "Ajouté par vous"}
                </p>
                {doc.note ? <p className="mt-0.5 text-xs italic text-[var(--muted-foreground)]">« {doc.note} »</p> : null}
              </div>
              {doc.uploadedByRole === "staff" && !doc.sharedWithClientAt ? (
                <button
                  type="button"
                  onClick={() => setShareTarget(doc)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-300 px-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                  title="Partager au client"
                >
                  <Share2 className="h-3.5 w-3.5" /> Partager
                </button>
              ) : null}
              <a
                href={doc.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                title="Ouvrir"
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

      <ConfirmDialog
        open={shareTarget !== null}
        title="Partager le document ?"
        message={`Êtes-vous sûr de vouloir partager « ${shareTarget?.name ?? ""} » avec le client ? Il sera visible dans son espace personnel.`}
        confirmLabel="Oui, partager"
        busy={sharing}
        onConfirm={confirmShare}
        onCancel={() => setShareTarget(null)}
      />
    </div>
  );
}

/* ─── Onglet Messagerie (staff) ───────────────────────────────────────────── */

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

export function CompanyMessagesTab({ companyId }: { companyId: Id<"bpCompanies"> }) {
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
    <div className="flex h-full min-h-[320px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages === undefined ? (
          <FullSpinner label="Chargement…" />
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            Aucun message avec ce client.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m._id}
              className={cn(
                "flex items-end gap-2",
                m.senderRole === "staff" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <MessageAvatar name={m.senderName} imageUrl={m.senderImageUrl} />
              <div className={cn("flex min-w-0 max-w-[80%] flex-col", m.senderRole === "staff" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-full rounded-2xl px-4 py-2.5 text-sm",
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
