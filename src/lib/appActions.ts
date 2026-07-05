import { createContext, useContext } from "react";
import type { Id } from "../../convex/_generated/dataModel";

/** Actions globales déclenchables depuis la sidebar ou les pages (modales). */
export type AppActions = {
  openNewDepot: () => void;
  /** Ouvre la modale entreprise (création si pas d'id, édition sinon). */
  openCompany: (companyId?: Id<"bpCompanies">) => void;
};

export const AppActionsContext = createContext<AppActions | null>(null);

export function useAppActions(): AppActions {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error("useAppActions doit être utilisé dans AppLayout.");
  return ctx;
}
