import type { ReactNode } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { ShieldAlert } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { canAccess, hasBennesProAccess, type Access, type Action } from "../lib/permissions";
import { FullSpinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";

/** Charge les droits de l'utilisateur courant (undefined tant que non chargé). */
export function useAccess(): Access | undefined {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.permissions.myAccess, isAuthenticated ? {} : "skip") as
    | Access
    | undefined;
}

/** Garde d'accès pour une page. Affiche un état vide si l'accès est refusé. */
export function RequirePermission({
  pageKey,
  action = "read",
  adminOnly,
  children,
}: {
  pageKey?: string;
  action?: Action;
  adminOnly?: boolean;
  children: ReactNode;
}) {
  const access = useAccess();

  if (access === undefined) return <FullSpinner label="Chargement…" />;

  const allowed = adminOnly
    ? access.isAdmin
    : pageKey
      ? canAccess(access, pageKey, action)
      : hasBennesProAccess(access);

  if (!allowed) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-8 w-8" />}
        title="Accès non autorisé"
        description="Vous n'avez pas les droits nécessaires pour cette page. Demandez l'accès à un administrateur depuis Mes Outils."
      />
    );
  }

  return <>{children}</>;
}
