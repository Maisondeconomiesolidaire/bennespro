import { useEffect, useState } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";

type AuthMode = "choice" | "sign-in" | "sign-up";

/**
 * Choix d'authentification puis formulaire Clerk local.
 *
 * On garde `<SignIn>` et `<SignUp>` locaux pour éviter le portail hébergé Clerk,
 * mais on n'affiche Clerk qu'après le choix explicite de l'utilisateur.
 */
export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>(() => {
    if (window.location.hash.startsWith("#/sign-up")) return "sign-up";
    if (window.location.hash.startsWith("#/sign-in")) return "sign-in";
    return "choice";
  });

  useEffect(() => {
    // Bascule uniquement sur les liens explicites #/sign-up et #/sign-in. Les
    // autres hashs (#/verify-email-address, #/factor-one…) sont des étapes
    // internes de Clerk et ne doivent pas changer de formulaire.
    const sync = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#/sign-up")) setMode("sign-up");
      else if (hash.startsWith("#/sign-in")) setMode("sign-in");
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function choose(next: Exclude<AuthMode, "choice">) {
    setMode(next);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/${next}`);
  }

  if (mode === "choice") {
    return (
      <div className="grid gap-3">
        <button type="button" onClick={() => choose("sign-in")} className="rounded-2xl bg-brand-500 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-600">
          J'ai déjà un compte, me connecter
        </button>
        <button type="button" onClick={() => choose("sign-up")} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-base font-bold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500/60 hover:bg-[var(--accent)]">
          Je m'inscris
        </button>
      </div>
    );
  }

  return mode === "sign-up" ? (
    <SignUp routing="hash" fallbackRedirectUrl="/" signInUrl="#/sign-in" />
  ) : (
    <SignIn routing="hash" fallbackRedirectUrl="/" signUpUrl="#/sign-up" />
  );
}
