import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { RequirePermission } from "./components/RequirePermission";
import { PAGE_DEPOTS, PAGE_ENTREPRISES } from "./lib/permissions";
import { Depots } from "./pages/Depots";
import { Entreprises } from "./pages/Entreprises";
import { Dib } from "./pages/Dib";
import { Compte } from "./pages/Compte";
import { UpdateAvailableBanner } from "./components/UpdateAvailableBanner";

export default function App() {
  return (
    <>
      <UpdateAvailableBanner appName="Bennes Pro" />
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <RequirePermission pageKey={PAGE_DEPOTS}>
                <Depots />
              </RequirePermission>
            }
          />
          <Route
            path="/entreprises"
            element={
              <RequirePermission pageKey={PAGE_ENTREPRISES}>
                <Entreprises />
              </RequirePermission>
            }
          />
          <Route
            path="/dib"
            element={
              <RequirePermission pageKey={PAGE_DEPOTS}>
                <Dib />
              </RequirePermission>
            }
          />
          <Route path="/compte" element={<Compte />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
