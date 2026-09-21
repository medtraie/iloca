import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation, Outlet, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopHeader } from "@/components/TopHeader";
import { Home, FileText, Car, Receipt, Menu, ShieldCheck, Settings as SettingsIcon } from "lucide-react";
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
        { label: "Revenus", icon: Receipt, path: "/recette" },
      ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t px-2 py-2 pb-[calc(env(safe-area-inset-bottom,0px)+6px)] shadow-lg flex items-center justify-between">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${
              isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}
      <button
        onClick={toggleSidebar}
        className="flex flex-col items-center gap-1 flex-1 py-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
        <span className="text-[10px]">Menu</span>
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
