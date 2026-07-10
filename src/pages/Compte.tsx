import { useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Camera, Check, LogOut } from "lucide-react";
import { cn } from "../lib/cn";

const INPUT =
  "mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-brand-500";

export function Compte() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded || !user) {
    return <div className="grid min-h-[60vh] place-items-center text-[var(--muted-foreground)]">Chargement…</div>;
  }

  const account = user;
  const email = account.primaryEmailAddress?.emailAddress ?? "";
  const currentFirst = firstName || account.firstName || "";
  const currentLast = lastName || account.lastName || "";
  const displayName = [account.firstName, account.lastName].filter(Boolean).join(" ") || email || "Mon compte";

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await account.update({ firstName: currentFirst.trim(), lastName: currentLast.trim() });
      await account.reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Impossible d'enregistrer vos informations.");
    } finally {
      setSaving(false);
    }
  }

  async function changePhoto(file?: File) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await account.setProfileImage({ file });
      await account.reload();
    } catch {
      setError("Impossible de mettre à jour la photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Mon compte</h1>

      <div className="mt-6">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-2xl font-semibold text-white">
                {account.imageUrl ? (
                  <img src={account.imageUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  displayName.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-[var(--foreground)]">{displayName}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{email}</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => changePhoto(e.target.files?.[0])} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)]"
                >
                  <Camera className="h-4 w-4" /> {uploading ? "Envoi..." : "Changer la photo"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Prénom
                <input className={INPUT} value={currentFirst} onChange={(e) => setFirstName(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Nom
                <input className={INPUT} value={currentLast} onChange={(e) => setLastName(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-[var(--foreground)] sm:col-span-2">
                Adresse e-mail
                <input className={cn(INPUT, "opacity-60")} value={email} disabled />
              </label>
            </div>

            {error ? <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p> : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <button
                type="button"
                onClick={() => void signOut({ redirectUrl: "/" })}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted-foreground)]"
              >
                <LogOut className="h-4 w-4" /> Se déconnecter
              </button>
              <div className="flex items-center gap-3">
                {saved ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                    <Check className="h-4 w-4" /> Enregistré
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </section>
      </div>
    </div>
  );
}
