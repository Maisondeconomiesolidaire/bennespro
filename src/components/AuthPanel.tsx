import { AuthSwitch } from "./ui/auth-switch";

/**
 * Écran d'authentification, branché sur le portail partagé de l'écosystème
 * (voir `ui/auth-switch`).
 *
 * Le portail occupe TOUTE la page : ne le remets pas dans une carte étroite,
 * il s'y replierait en version mobile au milieu d'un grand écran.
 */
export function AuthPanel({ redirectUrl }: { redirectUrl?: string } = {}) {
  return <AuthSwitch appName="Bennes Pro" logoSrc="/bennespro-logo.png" redirectUrl={redirectUrl} homeHref="/" homeLabel="Retour au site" />;
}
