import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CrmLayout } from "./components/crm/CrmLayout";
import { RequirePermission } from "./components/RequirePermission";
import { PAGE_DEPOTS, PAGE_ENTREPRISES } from "./lib/permissions";
import { Depots } from "./pages/Depots";
import { Entreprises } from "./pages/Entreprises";
import { Messages } from "./pages/Messages";
import { Dib } from "./pages/Dib";
import { Frequentation } from "./pages/Frequentation";
import { Compte } from "./pages/Compte";
import { Profils } from "./pages/Profils";
import { PublicLayout } from "./components/public/PublicLayout";
import { RequirePublicAccount } from "./components/public/RequirePublicAccount";
import { Landing } from "./pages/public/Landing";
import { AuthPage } from "./pages/public/AuthPage";
import {
  AccountLayout,
  AccountInfo,
  AccountDepots,
  AccountDocuments,
  AccountMessages,
  AccountDocumentation,
} from "./pages/public/Account";
import { UpdateAvailableBanner } from "./components/UpdateAvailableBanner";
import { ProfileSync } from "./components/ProfileSync";

export default function App() {
  return (
    <>
      {/* Hors de toute garde d'authentification : l'origine de l'inscription
          se constitue pendant la visite déconnectée. */}
      <ProfileSync app="bennespro" />
      <UpdateAvailableBanner appName="Bennes Pro" />
      <Routes>
        {/* Page dédiée de connexion : hors du shell public, comme sur Mes
            Outils et BâtiRe — le portail occupe tout l'écran. */}
        <Route path="/connexion" element={<AuthPage />} />
        <Route path="/inscription" element={<AuthPage initialMode="signup" />} />
        <Route path="/auth" element={<LegacyAuthRedirect />} />

        {/* Portail client public (thème clair) */}
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route
            path="/compte"
            element={
              <RequirePublicAccount>
                <AccountLayout />
              </RequirePublicAccount>
            }
          >
            <Route index element={<AccountInfo />} />
            <Route path="depots" element={<AccountDepots />} />
            <Route path="documentation" element={<AccountDocumentation />} />
            <Route path="documents" element={<AccountDocuments />} />
            <Route path="messagerie" element={<AccountMessages />} />
          </Route>
        </Route>

        {/* CRM staff (protégé par les permissions bennespro:*) */}
        <Route path="/crm" element={<CrmLayout />}>
          <Route
            index
            element={
              <RequirePermission pageKey={PAGE_DEPOTS}>
                <Depots />
              </RequirePermission>
            }
          />
          <Route
            path="entreprises"
            element={
              <RequirePermission pageKey={PAGE_ENTREPRISES}>
                <Entreprises />
              </RequirePermission>
            }
          />
          <Route
            path="messagerie"
            element={
              <RequirePermission pageKey={PAGE_ENTREPRISES}>
                <Messages />
              </RequirePermission>
            }
          />
          <Route
            path="frequentation"
            element={
              <RequirePermission pageKey={PAGE_DEPOTS}>
                <Frequentation />
              </RequirePermission>
            }
          />
          <Route
            path="dib"
            element={
              <RequirePermission pageKey={PAGE_DEPOTS}>
                <Dib />
              </RequirePermission>
            }
          />
          <Route path="profils" element={<Profils />} />
          <Route path="compte" element={<Compte />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

/** Ancien chemin du portail, conservé pour les liens déjà diffusés. */
function LegacyAuthRedirect() {
  const location = useLocation();
  const target = location.hash === "#sign-up" ? "/inscription" : "/connexion";
  return <Navigate to={`${target}${location.search}`} replace />;
}
