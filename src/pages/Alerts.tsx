import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { alertsService } from "@/services/alertsService";
import { gpswoxService, GpswoxEvent } from "@/services/gpswoxService";
import { getSupabaseClient } from "@/services/supabaseService";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";

import { useGPSwoxVehicles } from "@/hooks/useGPSwoxVehicles";

const color = (s: "info" | "warning" | "critical") =>
  s === "info" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : s === "warning" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";

export default function Alerts() {
  const isMobile = useIsMobile();
  const [gpsEvents, setGpsEvents] = useState<GpswoxEvent[]>([]);
  const { data: gpsVehicles = [] } = useGPSwoxVehicles(60000);
  const [syncing, setSyncing] = useState(false);
  const [gpsDebugError, setGpsDebugError] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<any[]>([]);

  useEffect(() => {
    alertsService.compute().then(items => {
      setLocalItems(items);
    }).catch(console.error);
  }, []);

  const items = useMemo(() => {
    return [
      ...localItems,
      ...gpsEvents.map((event) => {
        const vehicle = gpsVehicles.find(v => v.id === event.deviceId);
        return {
          id: `gps_${event.id}`,
          type: "vehicle_offline" as const,
          severity: event.severity,
          title: event.title,
          message: event.message,
          date: event.date,
          vehicleName: vehicle ? (vehicle.name || vehicle.plate) : (event.deviceId ? `Device ${event.deviceId}` : "Véhicule inconnu")
        };
      })
    ];
  }, [localItems, gpsEvents, gpsVehicles]);
  const counts = alertsService.groupCount(items);
  const grouped = useMemo(() => {
    return {
      critical: items.filter((i) => i.severity === "critical"),
      warning: items.filter((i) => i.severity === "warning"),
      info: items.filter((i) => i.severity === "info"),
    };
  }, [items.length]);

  const gpsSeverityCounts = useMemo(() => {
    return {
      critical: gpsEvents.filter((e) => e.severity === "critical").length,
      warning: gpsEvents.filter((e) => e.severity === "warning").length,
      info: gpsEvents.filter((e) => e.severity === "info").length
    };
  }, [gpsEvents]);

  const gpsByDay = useMemo(() => {
    const map: Record<string, { critical: number; warning: number; info: number; total: number }> = {};
    gpsEvents.forEach((e) => {
      const d = new Date(e.date);
      const key = d.toISOString().slice(0, 10);
      if (!map[key]) {
        map[key] = { critical: 0, warning: 0, info: 0, total: 0 };
      }
      map[key][e.severity] = map[key][e.severity] + 1;
      map[key].total += 1;
    });
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({
        date,
        critical: v.critical,
        warning: v.warning,
        info: v.info,
        total: v.total
      }));
  }, [gpsEvents]);

  const gpsSeverityPie = useMemo(() => {
    return [
      { name: "Critiques", value: gpsSeverityCounts.critical, color: "#EF4444" },
      { name: "Avertissements", value: gpsSeverityCounts.warning, color: "#F59E0B" },
      { name: "Infos", value: gpsSeverityCounts.info, color: "#0EA5E9" }
    ];
  }, [gpsSeverityCounts]);

  const latestGpsEvents = useMemo(() => {
    return [...gpsEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30)
      .map(event => {
        const vehicle = gpsVehicles.find(v => v.id === event.deviceId);
        return {
          ...event,
          vehicleName: vehicle ? (vehicle.name || vehicle.plate) : (event.deviceId ? `Device ${event.deviceId}` : "Véhicule inconnu")
        };
      });
  }, [gpsEvents, gpsVehicles]);

  const readFunctionDebugError = async () => {
    const sb = getSupabaseClient();
    if (!sb) {
      return "SUPABASE_NOT_CONFIGURED: Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY";
    }
    try {
      const { data, error } = await sb.functions.invoke("gpswox", {
        method: "POST",
        body: { target: "alerts" }
      });
      if (error) {
        return `FUNCTION_INVOKE_ERROR: ${error.message || "Unknown error"}`;
      }
      if (data?.ok === false) {
        const err = String(data?.error || "SFT_UNKNOWN_ERROR");
        return `FUNCTION_RESPONSE_ERROR: ${err}`;
      }
      if (!Array.isArray(data?.data) || data.data.length === 0) {
        return "SFT_NO_DATA_FOUND: la Function répond mais sans événements";
      }
      return null;
    } catch (error: any) {
      return `FUNCTION_EXCEPTION: ${error?.message || String(error)}`;
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const events = await gpswoxService.getEvents();
        setGpsEvents(events);
        if (!events.length) {
          const debugMsg = await readFunctionDebugError();
          setGpsDebugError(debugMsg);
        } else {
          setGpsDebugError(null);
        }
      } catch {
        const debugMsg = await readFunctionDebugError();
        setGpsDebugError(debugMsg);
      }
    };
    run();
  }, []);

  const syncGpsAlerts = async () => {
    try {
      setSyncing(true);
      const events = await gpswoxService.getEvents();
      setGpsEvents(events);
      if (!events.length) {
        const debugMsg = await readFunctionDebugError();
        setGpsDebugError(debugMsg);
        toast.error("Aucune alerte GPS reçue");
      } else {
        setGpsDebugError(null);
      }
      toast.success("Alertes SFT synchronisées");
    } catch {
      const debugMsg = await readFunctionDebugError();
      setGpsDebugError(debugMsg);
      toast.error("Erreur de synchronisation SFT");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 safe-pt safe-pb">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Alertes</h1>
          <p className="text-sm text-muted-foreground">
            Synthèse des alertes locales et SFT (liées aux paramètres GPS Tracker)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncGpsAlerts} disabled={syncing}>
            {syncing ? "Sync..." : "Sync SFT"}
          </Button>
        </div>
      </div>

      {gpsDebugError ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Debug SFT Alerts</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-900 break-all">
            {gpsDebugError}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Total alertes GPS
              <Badge variant="secondary">{gpsEvents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Critiques: {gpsSeverityCounts.critical} • Avertissements: {gpsSeverityCounts.warning} • Infos:{" "}
            {gpsSeverityCounts.info}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Critiques <Badge variant="secondary">{counts.critical || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped.critical.map((a: any) => (
              <div key={a.id} className={`p-3 rounded-md ${color(a.severity)}`}>
                <div className="text-[10px] font-bold uppercase mb-1 text-red-600 dark:text-red-400">{a.vehicleName}</div>
                <div className="text-sm font-medium">{a.title}</div>
                <div className="text-xs">{a.message}</div>
              </div>
            ))}
            {grouped.critical.length === 0 ? <div className="text-sm text-muted-foreground">Aucune alerte critique</div> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Avertissements <Badge variant="secondary">{counts.warning || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped.warning.map((a: any) => (
              <div key={a.id} className={`p-3 rounded-md ${color(a.severity)}`}>
                <div className="text-[10px] font-bold uppercase mb-1 text-amber-600 dark:text-amber-400">{a.vehicleName}</div>
                <div className="text-sm font-medium">{a.title}</div>
                <div className="text-xs">{a.message}</div>
              </div>
            ))}
            {grouped.warning.length === 0 ? <div className="text-sm text-muted-foreground">Aucune alerte</div> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Infos <Badge variant="secondary">{counts.info || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped.info.map((a: any) => (
              <div key={a.id} className={`p-3 rounded-md ${color(a.severity)}`}>
                <div className="text-[10px] font-bold uppercase mb-1 text-amber-600 dark:text-amber-400">{a.vehicleName}</div>
                <div className="text-sm font-medium">{a.title}</div>
                <div className="text-xs">{a.message}</div>
              </div>
            ))}
            {grouped.info.length === 0 ? <div className="text-sm text-muted-foreground">Pas d'information</div> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des alertes GPS</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gpsByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="critical" stackId="a" fill="#EF4444" radius={[8, 8, 0, 0]} />
                <Bar dataKey="warning" stackId="a" fill="#F59E0B" />
                <Bar dataKey="info" stackId="a" fill="#0EA5E9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition des alertes GPS</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gpsSeverityPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={70}
                >
                  {gpsSeverityPie.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertes récentes SFT</CardTitle>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="space-y-3">
              {latestGpsEvents.map((e) => (
                <div key={e.id} className="p-3 border rounded-xl space-y-2 bg-card text-card-foreground shadow-sm text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-bold text-foreground text-sm truncate">{e.vehicleName}</span>
                      <span className="font-semibold text-muted-foreground text-[11px] truncate">{e.title}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        e.severity === "critical"
                          ? "bg-red-100 text-red-700"
                          : e.severity === "warning"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {e.severity}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{e.message}</p>
                  <div className="text-right text-[10px] text-muted-foreground pt-1.5 border-t">
                    {new Date(e.date).toLocaleDateString()} {new Date(e.date).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {!latestGpsEvents.length ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Aucune alerte GPS récente
                </div>
              ) : null}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 text-left">Véhicule</th>
                    <th className="py-2 text-left">Titre</th>
                    <th className="py-2 text-left">Message</th>
                    <th className="py-2 text-left">Sévérité</th>
                    <th className="py-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {latestGpsEvents.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-1 pr-2 max-w-[120px] truncate font-bold">{e.vehicleName}</td>
                      <td className="py-1 pr-2 max-w-[160px] truncate">{e.title}</td>
                      <td className="py-1 pr-2 max-w-[260px] truncate text-muted-foreground">
                        {e.message}
                      </td>
                      <td className="py-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            e.severity === "critical"
                              ? "bg-red-100 text-red-700"
                              : e.severity === "warning"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {e.severity}
                        </span>
                      </td>
                      <td className="py-1 text-right text-xs text-muted-foreground">
                        {new Date(e.date).toLocaleDateString()}{" "}
                        {new Date(e.date).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                  {!latestGpsEvents.length ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-sm text-muted-foreground">
                        Aucune alerte GPS récente
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link to="/vehicles" className="px-3 py-2 rounded-md bg-muted hover:bg-muted/80 text-sm">
            Véhicules
          </Link>
          <Link to="/contracts" className="px-3 py-2 rounded-md bg-muted hover:bg-muted/80 text-sm">
            Contrats
          </Link>
          <Link to="/tracking" className="px-3 py-2 rounded-md bg-muted hover:bg-muted/80 text-sm">
            Suivi
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
