import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Outlet, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopHeader } from "@/components/TopHeader";
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
import { CommandPalette } from "./components/CommandPalette";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const FleetMap = lazy(() => import("./pages/FleetMap"));
const Tracking = lazy(() => import("./pages/Tracking"));
const Fuel = lazy(() => import("./pages/Fuel"));
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

function AnimatedPage({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduce ? 0 : -8 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

function ProtectedLayout() {
  const location = useLocation();
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <TopHeader />
          <main className="flex-1 p-3 sm:p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <Toaster />
      <Sonner />
      <CommandPalette />
    </SidebarProvider>
  );
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();
  if (!isReady) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Chargement...</div>;
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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
                <Route index element={<Index />} />
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
                  path="fuel"
                  element={
                    <Suspense fallback={<div className="p-6">Chargement…</div>}>
                      <Fuel />
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
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
