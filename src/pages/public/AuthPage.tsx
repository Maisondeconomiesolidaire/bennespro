import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { AuthPanel } from "../../components/AuthPanel";

/** Page de connexion / inscription du portail client. */
export function AuthPage() {
  const location = useLocation();
  const redirectUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("redirect_url") || "/compte";
  }, [location.search]);

  return (
    <>
      <SignedIn>
        <Navigate to={redirectUrl} replace />
      </SignedIn>
      <SignedOut>
        <div className="mx-auto flex w-full max-w-xl items-center px-5 py-12">
          <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(24,24,27,0.08)] sm:p-8">
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">Espace client Déchet'Lab</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-600">
              Connectez-vous ou créez votre compte pour continuer.
            </p>
            <div className="mt-7 text-left">
              <AuthPanel redirectUrl={redirectUrl} />
            </div>
          </div>
        </div>
      </SignedOut>
    </>
  );
}
