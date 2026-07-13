import { Link, Navigate, useSearchParams } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { ArrowRight } from "lucide-react";

/** Accueil public. Gère la redirection des anciens QR `/?entreprise=<id>`. */
export function Landing() {
  const [params] = useSearchParams();
  const entreprise = params.get("entreprise");

  // Anciens QR codes imprimés : `/?entreprise=<id>` ouvrait un dépôt (CRM).
  if (entreprise) {
    return <Navigate to={`/crm?entreprise=${entreprise}`} replace />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 sm:px-6">
      <section className="py-14 text-center sm:py-20">
        <img src="/logo.png" alt="Déchet'Lab" className="mx-auto h-16 w-auto object-contain sm:h-20" />
        <h1 className="mx-auto mt-8 max-w-2xl text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
          Votre espace client Déchet'Lab
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-600">
          Gérez votre entreprise, suivez vos dépôts de déchets, partagez vos documents et
          échangez avec notre équipe — le tout au même endroit.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <SignedIn>
            <Link
              to="/compte"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              Accéder à mon espace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </SignedIn>
          <SignedOut>
            <Link
              to="/auth#sign-up"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              Créer mon compte
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
            >
              J'ai déjà un compte
            </Link>
          </SignedOut>
        </div>
      </section>
    </div>
  );
}
