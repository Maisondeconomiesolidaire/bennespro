import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { KeyRound, Loader2, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import { useProfileContext } from "../lib/profile";

const COLORS = ["#2aa79b", "#e0894a", "#7b6cd9", "#d95a7b", "#4a8fe0", "#68a84b"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Administration des profils du compte partagé, derrière un code PIN.
 *
 * Le PIN est vérifié côté serveur, et re-transmis à chaque écriture : le
 * déverrouillage de l'écran ne suffit pas à autoriser une modification. Ce
 * n'est pas un secret — quiconque a le compte peut l'apprendre — mais un
 * garde-fou contre la manipulation distraite d'un poste laissé ouvert.
 */
export function Profils() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const check = useQuery(
    api.bennesproProfiles.checkPin,
    pin.length === 4 ? { pin } : "skip",
  );

  if (!unlocked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10">
            <KeyRound className="h-7 w-7 text-brand-500" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-[var(--foreground)]">Profils</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Saisissez le code à 4 chiffres pour gérer les profils.
          </p>

          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoFocus
            placeholder="••••"
            className="mx-auto mt-6 block w-40 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-center text-2xl tracking-[0.5em] text-[var(--foreground)] outline-none focus:border-brand-500"
          />

          {pin.length === 4 && check?.ok === false && (
            <p className="mt-3 text-sm text-red-500">Code incorrect.</p>
          )}

          <Button
            className="mt-5 w-full"
            disabled={pin.length !== 4 || !check?.ok}
            onClick={() => setUnlocked(true)}
          >
            Déverrouiller
          </Button>
        </div>
      </div>
    );
  }

  return <ProfilesManager pin={pin} />;
}

function ProfilesManager({ pin }: { pin: string }) {
  const { profiles, profile: activeProfile, setProfile } = useProfileContext();
  const createProfile = useMutation(api.bennesproProfiles.create);
  const updateProfile = useMutation(api.bennesproProfiles.update);
  const removeProfile = useMutation(api.bennesproProfiles.remove);
  const toast = useToast();

  const [editing, setEditing] = useState<
    | { id: Id<"bpProfiles"> | null; name: string; role: string; color: string }
    | null
  >(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!editing || saving) return;
    setSaving(true);
    try {
      if (editing.id) {
        await updateProfile({
          pin,
          id: editing.id,
          name: editing.name,
          role: editing.role || undefined,
          color: editing.color || undefined,
        });
      } else {
        await createProfile({
          pin,
          name: editing.name,
          role: editing.role || undefined,
          color: editing.color || undefined,
        });
      }
      setEditing(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: Id<"bpProfiles">, name: string) {
    if (!window.confirm(`Supprimer le profil « ${name} » ?`)) return;
    try {
      await removeProfile({ pin, id });
      // Le profil actif vient de disparaître : on redemandera qui utilise l'app.
      if (activeProfile?._id === id) setProfile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Compte partagé
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">Profils</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Chaque personne choisit son profil à l'ouverture : c'est ce nom qui
            est inscrit sur les dépôts qu'elle enregistre.
          </p>
        </div>
        <Button
          onClick={() =>
            setEditing({ id: null, name: "", role: "", color: COLORS[0] })
          }
        >
          <Plus className="h-4 w-4" />
          Nouveau profil
        </Button>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <UserRound className="mx-auto h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="mt-3 font-semibold text-[var(--foreground)]">
            Aucun profil pour l'instant
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Créez un profil par personne utilisant ce compte.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile, index) => {
            const color = profile.color ?? COLORS[index % COLORS.length];
            return (
              <div
                key={profile._id}
                className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white"
                  style={{ backgroundColor: color }}
                >
                  {initials(profile.name) || <UserRound className="h-6 w-6" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--foreground)]">
                    {profile.name}
                  </p>
                  {profile.role && (
                    <p className="truncate text-sm text-[var(--muted-foreground)]">
                      {profile.role}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      id: profile._id,
                      name: profile.name,
                      role: profile.role ?? "",
                      color: profile.color ?? color,
                    })
                  }
                  className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(profile._id, profile.name)}
                  className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-red-500/10 hover:text-red-500"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Modifier le profil" : "Nouveau profil"}
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Nom">
              <Input
                value={editing.name}
                autoFocus
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Prénom Nom"
              />
            </Field>
            <Field label="Rôle (facultatif)">
              <Input
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                placeholder="Chauffeur, quai…"
              />
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Couleur</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditing({ ...editing, color })}
                    className={`h-9 w-9 rounded-lg transition ${
                      editing.color === color
                        ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-[var(--card)]"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Couleur ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving || !editing.name.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
