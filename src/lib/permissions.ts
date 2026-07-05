/**
 * Permissions côté Bennes & Pro. Le backend (`permissions.myAccess`) renvoie
 * les grants de l'utilisateur ; on filtre ici sur le préfixe `bennespro:`.
 * Les droits sont attribués depuis l'admin « Mes Outils ».
 */

export type Action = "read" | "create" | "update" | "delete" | "manage";

export type Grant = {
  pageKey: string;
  actions: string[];
};

export type Access = {
  role: string;
  isStaff: boolean;
  isAdmin: boolean;
  email: string | null;
  bootstrapMode: boolean;
  grants: Grant[];
};

/** Clés de permission de l'application. */
export const PAGE_DEPOTS = "bennespro:depots";
export const PAGE_ENTREPRISES = "bennespro:entreprises";
export const PAGE_ADMIN = "bennespro:admin";

/** L'utilisateur a-t-il accès à l'app (au moins un droit `bennespro:` ou admin) ? */
export function hasBennesProAccess(access: Access | undefined): boolean {
  if (!access) return false;
  if (access.isAdmin || access.bootstrapMode) return true;
  if (!access.isStaff) return false;
  return access.grants.some((grant) => grant.pageKey.startsWith("bennespro:"));
}

/** L'utilisateur peut-il réaliser `action` sur la page `pageKey` ? */
export function canAccess(
  access: Access | undefined,
  pageKey: string,
  action: Action = "read",
): boolean {
  if (!access) return false;
  if (access.isAdmin || access.bootstrapMode) return true;
  if (!access.isStaff) return false;
  return Boolean(
    access.grants.find((grant) => grant.pageKey === pageKey)?.actions.includes(action),
  );
}
