
import { Home, FileText, Users, Car, Receipt, Wrench, BarChart3, FileSpreadsheet, Settings, CreditCard, Wallet, ChartBar, Map, Activity, Fuel, Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";

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
    { title: "Carburant", url: "/fuel", icon: Fuel },
    { title: "Alertes", url: "/alerts", icon: Bell },
    { title: "Analytique", url: "/analytics", icon: ChartBar },
  ],
};

export function AppSidebar() {
  const location = useLocation();
  
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
            <span className="text-lg font-bold tracking-tight text-white leading-tight">
              SFTLOCATION
            </span>
            <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-medium">
              Premium Fleet
            </span>
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
              {nav.dashboard.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    tooltip={item.title}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${location.pathname === item.url 
                        ? "bg-white/10 text-accent"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon className={`h-5 w-5 transition-transform duration-200 ${location.pathname === item.url ? 'text-accent' : 'group-hover:scale-110'}`} />
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
              {nav.management.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    tooltip={item.title}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${location.pathname === item.url 
                        ? "bg-white/10 text-accent" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                      }
                    `}
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon className={`h-5 w-5 transition-transform duration-200 ${location.pathname === item.url ? 'text-accent' : 'group-hover:scale-110'}`} />
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
              {nav.finance.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    tooltip={item.title}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${location.pathname === item.url 
                        ? "bg-white/10 text-accent" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                      }
                    `}
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon className={`h-5 w-5 transition-transform duration-200 ${location.pathname === item.url ? 'text-accent' : 'group-hover:scale-110'}`} />
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
              {nav.extras.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    tooltip={item.title}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${location.pathname === item.url 
                        ? "bg-white/10 text-accent" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                      }
                    `}
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon className={`h-5 w-5 transition-transform duration-200 ${location.pathname === item.url ? 'text-accent' : 'group-hover:scale-110'}`} />
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
                ${location.pathname === '/settings' 
                  ? 'bg-white/10 text-accent' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Link to="/settings" className="flex items-center gap-3 w-full">
                <Settings className={`h-5 w-5 ${location.pathname === '/settings' ? 'text-accent' : ''}`} />
                <span className="text-sm font-bold">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <div className="mt-4 px-4 py-3 bg-white/5 rounded-2xl flex items-center gap-3 border border-white/5">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-black font-bold text-xs">
              AD
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-white truncate">Admin</span>
              <span className="text-[10px] text-white/40 truncate">admin@sftlocation.com</span>
            </div>
          </div>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
