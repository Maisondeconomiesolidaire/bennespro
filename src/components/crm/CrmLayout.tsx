import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from "@clerk/clerk-react";
import { AuthPanel } from "../AuthPanel";
import { AppSwitcher } from "../AppSwitcher";
import { useConvexAuth, useMutation } from "convex/react";
import {
  Building2,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Recycle,
  Sun,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { AppActionsContext } from "../../lib/appActions";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAccess } from "../RequirePermission";
import { hasBennesProAccess } from "../../lib/permissions";
import { FullSpinner } from "../ui/Spinner";
import { NewDepotWizard } from "../NewDepotWizard";
import { CompanyModal } from "../CompanyModal";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "../../lib/useTheme";

const NAV_ACTIVE = "bg-brand-500 text-white shadow-[0_8px_18px_rgba(42,167,155,0.25)]";

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/crm", label: "Dépôts", icon: Recycle },
  { to: "/crm/entreprises", label: "Entreprises", icon: Building2 },
  { to: "/crm/messagerie", label: "Messagerie", icon: MessageSquare },
  { to: "/crm/dib", label: "DIB", icon: Truck },
];

export function CrmLayout() {
  const [theme, setTheme] = useTheme();

  return (
    <>
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-between">
              <BrandLogo />
              <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
            </div>
            <div className="glass-card rounded-xl border border-[var(--border)] p-4 sm:p-6">
              <AuthPanel />
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <ConvexAuthenticatedShell theme={theme} setTheme={setTheme} />
      </SignedIn>
    </>
  );
}

function ConvexAuthenticatedShell({ theme, setTheme }: { theme: "light" | "dark"; setTheme: (t: "light" | "dark") => void }) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) return <FullSpinner label="Synchronisation de la session…" />;

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="glass-card max-w-lg rounded-xl border border-[var(--border)] p-6 text-center">
          <BrandLogo className="mx-auto" />
          <h1 className="mt-6 text-xl font-semibold text-[var(--foreground)]">Connexion Convex non active</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
            Votre session est ouverte mais Convex ne reçoit pas de jeton valide. Vérifiez le template JWT <code>convex</code> dans Clerk.
          </p>
          <div className="mt-6 flex justify-center"><UserButton afterSignOutUrl="/" /></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProfileSync />
      <AuthenticatedShell theme={theme} setTheme={setTheme} />
    </>
  );
}

/** Crée/rafraîchit le profil Convex à la connexion et rattache les données. */
function ProfileSync() {
  const syncProfile = useMutation(api.users.syncProfile);
  useEffect(() => {
    void syncProfile({
      source: { app: "bennespro", path: window.location.pathname + window.location.search },
    });
  }, [syncProfile]);
  return null;
}

function AuthenticatedShell({ theme, setTheme }: { theme: "light" | "dark"; setTheme: (t: "light" | "dark") => void }) {
  const access = useAccess();
  const { user } = useUser();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [depotOpen, setDepotOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [editCompanyId, setEditCompanyId] = useState<Id<"bpCompanies"> | undefined>(undefined);
  const [scannedCompanyId, setScannedCompanyId] = useState<Id<"bpCompanies"> | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // QR code scanné avec l'appareil photo : `/crm?entreprise=<id>` ouvre
  // directement un nouveau dépôt avec l'entreprise présélectionnée.
  useEffect(() => {
    const companyParam = searchParams.get("entreprise");
    if (!companyParam) return;
    setScannedCompanyId(companyParam as Id<"bpCompanies">);
    setDepotOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("entreprise");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const actions = useMemo(
    () => ({
      openNewDepot: () => setDepotOpen(true),
      openCompany: (companyId?: Id<"bpCompanies">) => {
        setEditCompanyId(companyId);
        setCompanyOpen(true);
      },
    }),
    [],
  );

  if (access === undefined) return <FullSpinner label="Chargement…" />;

  if (!hasBennesProAccess(access)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="glass-card max-w-lg rounded-xl border border-[var(--border)] p-6 text-center">
          <BrandLogo className="mx-auto" />
          <h1 className="mt-6 text-xl font-semibold text-[var(--foreground)]">Accès non autorisé</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
            Votre compte n'a pas encore accès au CRM Bennes & Pro. Demandez à un administrateur de vous attribuer le droit depuis Mes Outils.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link to="/" className="text-sm font-semibold text-brand-600 hover:underline">
              Retour à mon espace client
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    );
  }

  const sidebar = (
    <SidebarContent
      theme={theme}
      setTheme={setTheme}
      currentPath={location.pathname}
      userName={user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Moi"}
      userEmail={user?.primaryEmailAddress?.emailAddress}
      userImage={user?.imageUrl}
    />
  );

  return (
    <AppActionsContext.Provider value={actions}>
      <div className="min-h-screen lg:pl-64">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--card)] lg:flex">
          {sidebar}
        </aside>

        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--nav-bg)] px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--accent)]"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/crm"><BrandLogo compact /></Link>
          <div className="ml-auto flex items-center gap-1">
            <AppSwitcher current="bennespro" />
          </div>
        </header>

        {mobileOpen ? (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--border)] bg-[var(--card)]">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        ) : null}

        <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <NewDepotWizard
        open={depotOpen}
        onClose={() => {
          setDepotOpen(false);
          setScannedCompanyId(null);
        }}
        initialCompanyId={scannedCompanyId}
      />
      <CompanyModal open={companyOpen} onClose={() => setCompanyOpen(false)} companyId={editCompanyId} />
    </AppActionsContext.Provider>
  );
}

function SidebarContent({
  theme,
  setTheme,
  currentPath,
  userName,
  userEmail,
  userImage,
}: {
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  currentPath: string;
  userName: string;
  userEmail?: string;
  userImage?: string | null;
}) {
  return (
    <>
      <div className="flex h-16 items-center justify-between gap-2 border-b border-[var(--border)] px-5">
        <Link to="/crm"><BrandLogo /></Link>
        <AppSwitcher current="bennespro" />
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.to || (item.to !== "/crm" && currentPath.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/crm"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  isActive ? NAV_ACTIVE : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]",
                )
              }
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-[var(--muted-foreground)]")} />
              <span className={cn("min-w-0 flex-1 truncate", active && "text-white")}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-[var(--border)] p-3">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Mode clair" : "Mode sombre"}
        </button>
        <div className="flex items-center gap-1.5">
          <Link
            to="/crm/compte"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-[var(--accent)] px-3 py-2 transition hover:brightness-95"
          >
            <UserAvatar name={userName} src={userImage} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">{userName}</p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">{userEmail}</p>
            </div>
          </Link>
          <SignOutButton />
        </div>
      </div>
    </>
  );
}

function BrandLogo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <img
      src="/logo.png"
      alt="Bennes & Pro"
      className={cn(compact ? "h-8 w-auto" : "h-11 w-auto", className)}
    />
  );
}

function UserAvatar({ name, src }: { name: string; src?: string | null }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-xs font-semibold text-white">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      onClick={() => void signOut({ redirectUrl: "/" })}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
      aria-label="Se déconnecter"
      title="Se déconnecter"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--accent)]"
      aria-label="Basculer le thème"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
