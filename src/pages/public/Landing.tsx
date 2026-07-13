import { Link, Navigate, useSearchParams } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { ArrowRight, MessageSquare, Truck, Upload } from "lucide-react";

const FEATURES = [
  {
    icon: Truck,
    title: "Vos dépôts en un coup d'œil",
    text: "Retrouvez l'historique de vos dépôts, téléchargez vos bons de dépôt et vos factures DIB.",
  },
  {
    icon: Upload,
    title: "Vos documents centralisés",
    text: "Transmettez votre KBIS, votre RIB… et recevez les documents que nous partageons avec vous.",
  },
  {
    icon: MessageSquare,
    title: "Une messagerie directe",
    text: "Échangez avec notre équipe sans passer par l'email, tout est regroupé dans votre espace.",
  },
];

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

      <section className="grid gap-4 pb-16 sm:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-bold text-zinc-950">{f.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{f.text}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
