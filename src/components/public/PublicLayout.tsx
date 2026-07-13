import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useEffect } from "react";
import { LayoutDashboard, LogIn } from "lucide-react";
import { hasBennesProAccess } from "../../lib/permissions";
import { useAccess } from "../RequirePermission";
import { useForceLightTheme } from "../../lib/useTheme";
import { cn } from "../../lib/cn";

const CONTAINER = "mx-auto w-full max-w-5xl px-5 sm:px-6";

/** Coquille du portail public (client). Toujours en thème clair. */
export function PublicLayout() {
  useForceLightTheme();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8f7] text-zinc-900">
      <Header />
      <main className="relative flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const access = useAccess();
  const isStaff = hasBennesProAccess(access);

  const accountLink = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
      isActive ? "bg-brand-500 text-white" : "text-zinc-700 hover:bg-zinc-200/70",
    );

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f6f8f7]/90 backdrop-blur-xl">
      <div className={cn(CONTAINER, "flex items-center justify-between gap-4 py-3.5")}>
        <Link to="/" className="shrink-0">
          <img src="/logo.png" alt="Déchet'Lab" className="h-10 w-auto object-contain" />
        </Link>

        <div className="flex items-center gap-2">
          {isStaff && (
            <Link
              to="/crm"
              className="hidden items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 sm:inline-flex"
            >
              <LayoutDashboard className="h-4 w-4" />
              CRM
            </Link>
          )}
          <SignedIn>
            <NavLink to="/compte" className={accountLink}>
              Mon espace
            </NavLink>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <LogIn className="h-4 w-4" />
              Se connecter
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white/70">
      <div className={cn(CONTAINER, "flex flex-col items-center justify-between gap-3 py-6 text-sm text-zinc-500 sm:flex-row")}>
        <p>© {new Date().getFullYear()} Déchet'Lab — Bennes &amp; Pro</p>
        <Link to="/crm" className="font-medium hover:text-zinc-800">
          Espace professionnel
        </Link>
      </div>
    </footer>
  );
}
