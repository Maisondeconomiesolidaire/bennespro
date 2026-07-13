import { useState } from "react";
import { useQuery } from "convex/react";
import { MessageSquare } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { FullSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { CompanyMessagesTab } from "../components/crm/CompanyTabs";
import { cn } from "../lib/cn";

/** Boîte de réception CRM : toutes les conversations clients au même endroit. */
export function Messages() {
  const conversations = useQuery(api.bennespro.listAllConversations, {});
  const [selected, setSelected] = useState<Id<"bpCompanies"> | null>(null);

  if (conversations === undefined) return <FullSpinner />;

  const active = selected ?? conversations[0]?.companyId ?? null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Messagerie</h1>

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title="Aucune conversation"
          description="Les messages des entreprises clientes apparaîtront ici."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-1.5">
            {conversations.map((c) => (
              <button
                key={c.companyId}
                type="button"
                onClick={() => setSelected(c.companyId)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
                  active === c.companyId
                    ? "border-brand-400 bg-brand-50/60"
                    : "border-[var(--border)] hover:bg-[var(--accent)]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">{c.companyName}</p>
                    <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
                      {new Date(c.lastAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                    {c.lastRole === "staff" ? "Vous : " : ""}
                    {c.lastBody}
                  </p>
                </div>
                {c.unread > 0 ? (
                  <span className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
                    {c.unread}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--border)] p-4">
            {active ? (
              <CompanyMessagesTab key={active} companyId={active} />
            ) : (
              <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">
                Sélectionnez une conversation.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
