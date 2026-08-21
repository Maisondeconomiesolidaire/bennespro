import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { UserRound } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Profils d'un compte partagé.
 *
 * Certains comptes Bennes & Pro sont utilisés par plusieurs personnes. À
 * l'ouverture, on demande « Qui utilise l'application ? » et le profil choisi
 * est inscrit sur les dépôts enregistrés ensuite : sans lui, tous porteraient
 * la même adresse email et on ne saurait pas qui était sur le terrain.
 *
 * Le choix est mémorisé sur l'appareil — sur une tablette de quai, se le voir
 * redemander à chaque rafraîchissement serait vite ignoré. Il reste changeable
 * à tout moment depuis l'en-tête du CRM.
 */
const STORAGE_KEY = "bennespro-profile";

export type Profile = {
  _id: Id<"bpProfiles">;
  name: string;
  role: string | null;
  color: string | null;
};

type ProfileContextValue = {
  /** Profil actif, ou `null` quand le compte n'utilise pas de profils. */
  profile: Profile | null;
  /** Vrai quand ce compte doit passer par un profil. */
  usesProfiles: boolean;
  profiles: Profile[];
  setProfile: (profile: Profile | null) => void;
};

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  usesProfiles: false,
  profiles: [],
  setProfile: () => {},
});

/** Profil à inscrire sur les actions, ou `null`. */
export function useProfile(): Profile | null {
  return useContext(ProfileContext).profile;
}

export function useProfileContext(): ProfileContextValue {
  return useContext(ProfileContext);
}

/** Identifiant du profil à transmettre aux mutations, ou `undefined`. */
export function useProfileId(): Id<"bpProfiles"> | undefined {
  return useContext(ProfileContext).profile?._id;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const data = useQuery(api.bennesproProfiles.myProfiles, {});
  const [profileId, setProfileId] = useState<string | null>(() =>
    window.localStorage.getItem(STORAGE_KEY),
  );

  const usesProfiles = data?.usesProfiles ?? false;
  const profiles = useMemo(() => (data?.profiles ?? []) as Profile[], [data]);

  // Un profil archivé entre deux sessions ne doit pas rester « actif ».
  const profile = useMemo(
    () => profiles.find((item) => item._id === profileId) ?? null,
    [profiles, profileId],
  );

  const setProfile = useCallback((next: Profile | null) => {
    setProfileId(next?._id ?? null);
    if (next) window.localStorage.setItem(STORAGE_KEY, next._id);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (profileId && profiles.length > 0 && !profile) {
      window.localStorage.removeItem(STORAGE_KEY);
      setProfileId(null);
    }
  }, [profile, profileId, profiles.length]);

  const value: ProfileContextValue = {
    profile: usesProfiles ? profile : null,
    usesProfiles,
    profiles,
    setProfile,
  };

  // Tant que la réponse n'est pas là, on ne bloque pas l'app : un compte
  // ordinaire ne doit jamais voir passer d'écran de sélection.
  if (usesProfiles && !profile) {
    return <ProfilePicker profiles={profiles} onPick={setProfile} />;
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

const FALLBACK_COLORS = [
  "#2aa79b",
  "#e0894a",
  "#7b6cd9",
  "#d95a7b",
  "#4a8fe0",
  "#68a84b",
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Écran « Qui utilise l'application ? », affiché avant tout le reste. */
export function ProfilePicker({
  profiles,
  onPick,
  onCancel,
}: {
  profiles: Profile[];
  onPick: (profile: Profile) => void;
  onCancel?: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Qui utilise l'application ?
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Votre profil est inscrit sur les dépôts que vous enregistrez.
        </p>

        {profiles.length === 0 ? (
          <p className="mt-10 text-sm text-[var(--muted-foreground)]">
            Aucun profil n'a encore été créé. Ouvrez l'onglet « Profils » du CRM
            pour en ajouter.
          </p>
        ) : (
          <div className="mt-10 flex flex-wrap items-start justify-center gap-6">
            {profiles.map((profile, index) => {
              const color = profile.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
              return (
                <button
                  key={profile._id}
                  type="button"
                  onClick={() => onPick(profile)}
                  className="group w-32 focus:outline-none"
                >
                  <span
                    className="flex h-32 w-32 items-center justify-center rounded-2xl text-3xl font-extrabold text-white shadow-lg transition group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-brand-500/40"
                    style={{ backgroundColor: color }}
                  >
                    {initials(profile.name) || <UserRound className="h-10 w-10" />}
                  </span>
                  <span className="mt-3 block truncate text-sm font-semibold text-[var(--foreground)]">
                    {profile.name}
                  </span>
                  {profile.role && (
                    <span className="block truncate text-xs text-[var(--muted-foreground)]">
                      {profile.role}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-10 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
