import { Navigate, Route, Routes } from "react-router-dom";
import { CrmLayout } from "./components/crm/CrmLayout";
import { RequirePermission } from "./components/RequirePermission";
import { PAGE_DEPOTS, PAGE_ENTREPRISES } from "./lib/permissions";
import { Depots } from "./pages/Depots";
import { Entreprises } from "./pages/Entreprises";
import { Messages } from "./pages/Messages";
import { Dib } from "./pages/Dib";
import { Compte } from "./pages/Compte";
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

export default function App() {
  return (
    <>
      <UpdateAvailableBanner appName="Bennes Pro" />
      <Routes>
        {/* Portail client public (thème clair) */}
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="/auth" element={<AuthPage />} />
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
            path="dib"
            element={
              <RequirePermission pageKey={PAGE_DEPOTS}>
                <Dib />
              </RequirePermission>
            }
          />
          <Route path="compte" element={<Compte />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
