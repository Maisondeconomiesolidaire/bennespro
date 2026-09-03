import { AuthSwitch } from "./ui/auth-switch";

/** Écran d’authentification personnalisé, connecté aux flux Clerk partagés. */
export function AuthPanel({ redirectUrl: _redirectUrl }: { redirectUrl?: string } = {}) {
  return <AuthSwitch appName="Bennes Pro" logoSrc="/bennespro-logo.png" homeHref="/" homeLabel="Retour au site" />;
}
