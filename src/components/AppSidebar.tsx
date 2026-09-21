import { useState, useEffect } from "react";
import {
  Home,
  FileText,
  Users,
  Car,
  Receipt,
  Wrench,
  BarChart3,
  FileSpreadsheet,
  Settings,
  CreditCard,
  Wallet,
  ChartBar,
  Map,
  Activity,
  Bell,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { adminService } from "@/services/adminService";

const nav = {
  dashboard: [
    { title: "Overview", url: "/", icon: Home },
    { title: "Analytics", url: "/reports", icon: ChartBar },
  ],
  management: [
    { title: "Clients", url: "/customers", icon: Users },
    { title: "Véhicules", url: "/vehicles", icon: Car },
    { title: "Contrats", url: "/contracts", icon: FileText },
  ],
  finance: [
    { title: "Revenus", url: "/recette", icon: Receipt },
    { title: "Dépenses", url: "/expenses", icon: Receipt },
    { title: "Chèques", url: "/cheques", icon: CreditCard },
    { title: "Trésorerie", url: "/tresorerie", icon: Wallet },
    { title: "Factures", url: "/factures", icon: FileSpreadsheet },
  ],
  extras: [
    { title: "Réparations", url: "/repairs", icon: Wrench },
    { title: "Rapports", url: "/reports", icon: BarChart3 },
    { title: "Carte", url: "/map", icon: Map },
    { title: "Suivi", url: "/tracking", icon: Activity },
    { title: "Alertes", url: "/alerts", icon: Bell },
    { title: "Analytique SFT", url: "/analytics", icon: ChartBar },
  ],
};

export function AppSidebar() {
  const location = useLocation();
  const { user, isSuperAdmin, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [totalUsersCount, setTotalUsersCount] = useState(4);

  useEffect(() => {
    if (isSuperAdmin) {
      const checkPending = async () => {
        try {
          const users = await adminService.getAllUsers();
          setTotalUsersCount(users.length);
          const pending = users.filter((u) => u.status === "en_attente").length;
          setPendingCount(pending);
        } catch {}
      };
      checkPending();
      const interval = setInterval(checkPending, 8000);
      return () => clearInterval(interval);
    }
  }, [isSuperAdmin]);

  // Si l'utilisateur est le Super Administrateur : affichage EXCLUSIF du panel d'administration
  if (isSuperAdmin) {
    return (
      <Sidebar
        className="border-none text-white min-h-screen shadow-none w-64 font-tajawal bg-sidebar-background"
        collapsible="icon"
      >
        <SidebarHeader className="border-none p-5 px-4 mb-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/40">
              PANEL D'ADMINISTRATION
            </span>
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <span className="truncate">Gouvernance Globale</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3">
          <SidebarGroup className="py-2">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Panel Admin & Comptes"
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      location.pathname === "/" || location.pathname === "/admin"
                        ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/30"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Link to="/" className="flex items-center gap-3 w-full">
                      <Users className="h-5 w-5 shrink-0" />
                      <span className="text-sm truncate">Panel Admin & Comptes</span>
                      {pendingCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black text-xs font-bold shrink-0">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Paramètres"
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      location.pathname === "/settings"
                        ? "bg-white/10 text-emerald-400 font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Link to="/settings" className="flex items-center gap-3 w-full">
                      <Settings className="h-5 w-5 shrink-0" />
                      <span className="text-sm">Paramètres</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 mt-auto space-y-4">
          {/* Indicateur de capacité comptes comme sur la capture */}
          <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 space-y-1.5">
            <div className="flex justify-between items-center">
              <span>Capacité Comptes</span>
              <span className="font-mono text-white/90 font-bold">{totalUsersCount} / 500</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalUsersCount / 500) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-bold text-white truncate">Super Admin</span>
              <span className="text-[10px] text-white/50 truncate font-mono">{user?.email}</span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl text-white/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Quitter la session"
            >
              <LogOut className="h-4 w-4" />
              <span>Quitter</span>
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
    );
  }

  // Si utilisateur normal (locataire ERP)
  return (
    <Sidebar
      className="border-none text-white min-h-screen shadow-none w-64 font-tajawal bg-sidebar-background"
      collapsible="icon"
    >
      <SidebarHeader className="border-none p-6 px-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(225,255,0,0.3)]">
            <Car className="h-6 w-6 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white leading-tight">SFTLOCATION</span>
            <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-medium">Premium Fleet</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="px-4 mb-2 text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {nav.dashboard.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${
                        location.pathname === item.url
                          ? "bg-white/10 text-accent"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon
                        className={`h-5 w-5 transition-transform duration-200 ${
                          location.pathname === item.url ? "text-accent" : "group-hover:scale-110"
                        }`}
                      />
                      <span className="text-sm font-semibold">{item.title}</span>
                      {location.pathname === item.url && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(225,255,0,0.8)]" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-2 mt-4">
          <SidebarGroupLabel className="px-4 mb-2 text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">
            Fleet Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {nav.management.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${
                        location.pathname === item.url
                          ? "bg-white/10 text-accent"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon
                        className={`h-5 w-5 transition-transform duration-200 ${
                          location.pathname === item.url ? "text-accent" : "group-hover:scale-110"
                        }`}
                      />
                      <span className="text-sm font-semibold">{item.title}</span>
                      {location.pathname === item.url && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(225,255,0,0.8)]" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-2 mt-4">
          <SidebarGroupLabel className="px-4 mb-2 text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">
            Financial
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {nav.finance.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${
                        location.pathname === item.url
                          ? "bg-white/10 text-accent"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon
                        className={`h-5 w-5 transition-transform duration-200 ${
                          location.pathname === item.url ? "text-accent" : "group-hover:scale-110"
                        }`}
                      />
                      <span className="text-sm font-semibold">{item.title}</span>
                      {location.pathname === item.url && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(225,255,0,0.8)]" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-2 mt-4">
          <SidebarGroupLabel className="px-4 mb-2 text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">
            Analytics & Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {nav.extras.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${
                        location.pathname === item.url
                          ? "bg-white/10 text-accent"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon
                        className={`h-5 w-5 transition-transform duration-200 ${
                          location.pathname === item.url ? "text-accent" : "group-hover:scale-110"
                        }`}
                      />
                      <span className="text-sm font-semibold">{item.title}</span>
                      {location.pathname === item.url && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(225,255,0,0.8)]" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${
                  location.pathname === "/settings"
                    ? "bg-white/10 text-accent"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }
              `}
            >
              <Link to="/settings" className="flex items-center gap-3 w-full">
                <Settings className={`h-5 w-5 ${location.pathname === "/settings" ? "text-accent" : ""}`} />
                <span className="text-sm font-bold">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <div className="mt-4 px-4 py-3 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-black font-bold text-xs shrink-0">
                {user?.fullName ? user.fullName[0].toUpperCase() : "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{user?.fullName || "Admin"}</span>
                <span className="text-[10px] text-white/40 truncate">{user?.email}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-white/40 hover:text-rose-400 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
