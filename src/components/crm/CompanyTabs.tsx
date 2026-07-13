import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, Check, Download, FileText, Send, Trash2, Upload } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Field } from "../ui/Field";
import { Input } from "../ui/Field";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { FileButton } from "../ui/FileButton";
import { FullSpinner } from "../ui/Spinner";
import { useToast } from "../ui/Toast";
import { useUpload } from "../../lib/useUpload";
import { DOC_TYPE_OPTIONS, docTypeLabel, type DocType } from "../../lib/companyProfile";
import { cn } from "../../lib/cn";

/* ─── Onglet Documents (staff) ────────────────────────────────────────────── */

export function CompanyDocumentsTab({ companyId }: { companyId: Id<"bpCompanies"> }) {
  const documents = useQuery(api.bennespro.listCompanyDocuments, { companyId });
  const addDoc = useMutation(api.bennespro.addCompanyDocument);
  const removeDoc = useMutation(api.bennespro.removeCompanyDocument);
  const validateDoc = useMutation(api.bennespro.validateCompanyDocument);
  const upload = useUpload();
  const toast = useToast();
  const [docType, setDocType] = useState<DocType>("autre");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
            <FileButton onFile={setFile} accept="application/pdf,image/*" selectedName={file?.name} />
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
