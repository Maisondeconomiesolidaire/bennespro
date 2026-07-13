import type { ReactNode } from "react";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";
import { AuthPanel } from "../AuthPanel";

/**
 * Réserve un contenu du portail public aux utilisateurs connectés. Sinon,
 * affiche le panneau d'authentification (retour à la même page après connexion).
 */
export function RequirePublicAccount({
  children,
  title = "Connectez-vous à votre espace client",
  description = "Créez votre compte ou connectez-vous pour gérer votre entreprise, vos documents et vos dépôts.",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const location = useLocation();
  const redirectUrl = `${location.pathname}${location.search}`;

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <div className="mx-auto flex w-full max-w-xl items-center px-5 py-12">
          <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(24,24,27,0.08)] sm:p-8">
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">{title}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-600">{description}</p>
            <div className="mt-7 text-left">
              <AuthPanel redirectUrl={redirectUrl} />
            </div>
          </div>
        </div>
      </SignedOut>
    </>
  );
}
