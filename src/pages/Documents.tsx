import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Field, Input } from "../components/ui/Field";
import { FileButton } from "../components/ui/FileButton";
import { FullSpinner } from "../components/ui/Spinner";
import { useToast } from "../components/ui/Toast";
import { useUpload } from "../lib/useUpload";

export function Documents() {
  const documents = useQuery(api.bennespro.listPublicDocumentsForCrm);
  const add = useMutation(api.bennespro.addPublicDocument);
  const remove = useMutation(api.bennespro.removePublicDocument);
  const upload = useUpload(); const toast = useToast();
  const [file, setFile] = useState<File | null>(null); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (!file) return toast.error("Sélectionnez un fichier."); setBusy(true); try { const storageId = await upload(file); await add({ storageId, name: file.name, note: note.trim() || undefined, mimeType: file.type || undefined }); setFile(null); setNote(""); toast.success("Document publié pour tous les clients."); } catch (error) { toast.error(error instanceof Error ? error.message : "Envoi impossible."); } finally { setBusy(false); } }
  return <div className="space-y-5"><div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[var(--foreground)]"><FileText className="h-6 w-6 text-brand-600" /> Documents</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Ces documents sont publiés dans « Documentation » pour toutes les entreprises.</p></div><form onSubmit={submit} className="space-y-3 rounded-xl border border-[var(--border)] p-4"><Field label="Fichier"><FileButton onFile={setFile} accept="application/pdf,image/*" selectedName={file?.name} /></Field><Field label="Description (optionnel)"><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex. Consignes de tri 2026" /></Field><Button type="submit" disabled={busy}><Upload className="h-4 w-4" />{busy ? "Publication…" : "Publier pour tous"}</Button></form>{documents === undefined ? <FullSpinner /> : documents.length === 0 ? <EmptyState icon={<FileText className="h-8 w-8" />} title="Aucun document publié" description="Ajoutez un premier document à la documentation client." /> : <div className="space-y-2">{documents.map((doc) => <div key={doc._id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><FileText className="h-5 w-5 text-brand-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{doc.name}</p>{doc.note ? <p className="text-xs text-[var(--muted-foreground)]">{doc.note}</p> : null}</div><a href={doc.url ?? undefined} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a><button type="button" onClick={() => void remove({ documentId: doc._id })} className="text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>}</div>;
}
