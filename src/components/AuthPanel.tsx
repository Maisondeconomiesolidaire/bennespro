import { AuthSwitch } from "./ui/auth-switch";

/**
 * Écran d'authentification Bennes Pro, branché sur le portail partagé de
 * l'écosystème (voir `ui/auth-switch`).
 *
 * Le portail est un écran PLEIN, servi par la page dédiée `/connexion`. Ne le
 * monte pas dans le shell public ni dans une carte : il s'y replierait en
 * version étroite au milieu d'un grand écran. Les pages protégées renvoient
 * vers `/connexion` plutôt que de l'afficher sur place.
 */
export function AuthPanel({
  redirectUrl,
  initialMode,
}: { redirectUrl?: string; initialMode?: "signin" | "signup" } = {}) {
  return (
    <AuthSwitch
      appName="Bennes Pro"
      logoSrc="/bennespro-logo.png"
      initialMode={initialMode}
      redirectUrl={redirectUrl}
      homeHref="/"
      homeLabel="Retour au site"
    />
  );
}
