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
        <AuthPanel redirectUrl={redirectUrl} />
      </SignedOut>
    </>
  );
}
