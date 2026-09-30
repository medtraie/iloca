import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation, Outlet, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopHeader } from "@/components/TopHeader";
import { Home, FileText, Car, Receipt, Menu, ShieldCheck, Settings as SettingsIcon, Users } from "lucide-react";
import Index from "./pages/Index";
import Contracts from "./pages/Contracts";
import Customers from "./pages/Customers";
import Vehicles from "./pages/Vehicles";
import Reports from "./pages/Reports";
import Repairs from "./pages/Repairs";
import Expenses from "./pages/Expenses";
import Recette from "./pages/Recette";
import SignContract from "./pages/SignContract";
import NotFound from "./pages/NotFound";
import Factures from "./pages/Factures";
import Settings from "./pages/Settings";
import Cheques from "./pages/Cheques";
import Tresorerie from "./pages/Tresorerie";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import { CommandPalette } from "./components/CommandPalette";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const FleetMap = lazy(() => import("./pages/FleetMap"));
const Tracking = lazy(() => import("./pages/Tracking"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Analytics = lazy(() => import("./pages/Analytics"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function MobileBottomNav() {
  const { toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const navItems = isSuperAdmin
    ? [
        { label: "Admin", icon: ShieldCheck, path: "/" },
        { label: "Paramètres", icon: SettingsIcon, path: "/settings" },
      ]
    : [
        { label: "Bord", icon: Home, path: "/" },
        { label: "Contrats", icon: FileText, path: "/contracts" },
        { label: "Véhicules", icon: Car, path: "/vehicles" },
        { label: "Clients", icon: Users, path: "/customers" },
        { label: "Revenus", icon: Receipt, path: "/recette" },
      ];

  return (
    <div className="md:hidden fixed bottom-2.5 left-2.5 right-2.5 z-40 bg-card/90 backdrop-blur-xl border border-border/70 rounded-3xl px-1.5 py-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+6px)] shadow-2xl flex items-center justify-around">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
              isActive
                ? "bg-primary/15 text-primary font-black shadow-xs scale-105"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <item.icon className={`h-4.5 w-4.5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
          </button>
        );
      })}
      <button
        onClick={toggleSidebar}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 px-1 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 active:scale-90"
      >
        <Menu className="h-4.5 w-4.5 stroke-[1.8]" />
        <span className="text-[10px] font-bold tracking-tight">Plus</span>
      </button>
    </div>
  );
}

function ProtectedLayout() {
  const location = useLocation();
  const { isAuthenticated, isReady, isSuperAdmin } = useAuth();

  if (!isReady) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground font-tajawal">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Le Super Administrateur n'a accès qu'à l'administration et aux paramètres
  if (isSuperAdmin) {
    const allowedAdminPaths = ["/", "/admin", "/settings"];
    if (!allowedAdminPaths.includes(location.pathname)) {
      return <Navigate to="/" replace />;
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background font-tajawal overflow-x-hidden pb-16 md:pb-0">
        <AppSidebar />
        <SidebarInset className="flex flex-col min-w-0 flex-1 overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </SidebarInset>
      </div>
      <MobileBottomNav />
      <Toaster />
      <Sonner />
      <CommandPalette />
    </SidebarProvider>
  );
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();
  if (!isReady) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground font-tajawal">Chargement...</div>;
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function DashboardOrAdmin() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <AdminDashboard /> : <Index />;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <TooltipProvider delayDuration={300}>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route path="/sign/:token" element={<SignContract />} />

              <Route path="/" element={<ProtectedLayout />}>
                <Route index element={<DashboardOrAdmin />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="contracts" element={<Contracts />} />
                <Route path="customers" element={<Customers />} />
                <Route path="vehicles" element={<Vehicles />} />
                <Route path="reports" element={<Reports />} />
                <Route path="repairs" element={<Repairs />} />
                <Route path="recette" element={<Recette />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="factures" element={<Factures />} />
                <Route path="cheques" element={<Cheques />} />
                <Route path="tresorerie" element={<Tresorerie />} />
                <Route path="settings" element={<Settings />} />
                <Route
                  path="map"
                  element={
                    <Suspense fallback={<div className="p-6">Chargement…</div>}>
                      <FleetMap />
                    </Suspense>
                  }
                />
                <Route
                  path="tracking"
                  element={
                    <Suspense fallback={<div className="p-6">Chargement…</div>}>
                      <Tracking />
                    </Suspense>
                  }
                />
                <Route
                  path="alerts"
                  element={
                    <Suspense fallback={<div className="p-6">Chargement…</div>}>
                      <Alerts />
                    </Suspense>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <Suspense fallback={<div className="p-6">Chargement…</div>}>
                      <Analytics />
                    </Suspense>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </TooltipProvider>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
