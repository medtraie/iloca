import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { localStorageService, Vehicle, Contract } from "@/services/localStorageService";
import { useGPSwoxVehicles } from "@/hooks/useGPSwoxVehicles";
import { gpswoxService, GpswoxEvent, GpswoxFuelRecord } from "@/services/gpswoxService";
import { toast } from "@/components/ui/sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Analytics() {
  const vehicles = localStorageService.getAll<Vehicle>("vehicles");
  const contracts = localStorageService.getAll<Contract>("contracts");
  const [fuelRecords, setFuelRecords] = useState<GpswoxFuelRecord[]>([]);
  const [events, setEvents] = useState<GpswoxEvent[]>([]);
  const [gpsDetailsLoading, setGpsDetailsLoading] = useState(false);
  const {
    data: gpsVehicles = [],
    isFetching: gpsSyncing,
    refetch: refetchGps,
    error: gpsError
  } = useGPSwoxVehicles(60000);
  const now = new Date();
  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
  });
  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    months.forEach((m) => (map[m] = 0));
    contracts.forEach((c) => {
      const d = new Date(c.created_at);
      const key = `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
      if (map[key] !== undefined) map[key] += Number(c.total_amount) || 0;
    });
    return months.map((m) => ({ name: m, revenue: Math.round(map[m]) }));
  }, [contracts.length]);
  const fleetAvailability = useMemo(() => {
    const available = vehicles.filter((v) => v.etat_vehicule === "disponible").length;
    const rented = vehicles.filter((v) => v.etat_vehicule === "loue").length;
    const maintenance = vehicles.filter((v) => v.etat_vehicule === "maintenance").length;
    return [
      { name: "Disponibles", value: available, color: "#22C55E" },
      { name: "Loués", value: rented, color: "#2563EB" },
      { name: "Maintenance", value: maintenance, color: "#F59E0B" },
    ];
  }, [vehicles.length]);
  const contractsPerMonth = useMemo(() => {
    const map: Record<string, number> = {};
    months.forEach((m) => (map[m] = 0));
    contracts.forEach((c) => {
      const d = new Date(c.created_at);
      const key = `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
      if (map[key] !== undefined) map[key] += 1;
    });
    return months.map((m) => ({ name: m, count: map[m] }));
  }, [contracts.length]);

  const gpsStats = useMemo(() => {
    if (!gpsVehicles.length) {
      return { totalDevices: 0, onlineDevices: 0, offlineDevices: 0, averageSpeed: 0, movingDevices: 0 };
    }
    const total = gpsVehicles.length;
    const online = gpsVehicles.filter((v) => v.status === "online" || v.status === "moving").length;
    const moving = gpsVehicles.filter((v) => v.status === "moving").length;
    const avgSpeed =
      gpsVehicles.reduce((sum, v) => sum + (v.lastPosition?.speed || 0), 0) / gpsVehicles.length;
    return {
      totalDevices: total,
      onlineDevices: online,
      offlineDevices: total - online,
      averageSpeed: Math.round(avgSpeed),
      movingDevices: moving
    };
  }, [gpsVehicles]);

  const gpsStatusDistribution = useMemo(() => {
    const online = gpsVehicles.filter((v) => v.status === "online").length;
    const moving = gpsVehicles.filter((v) => v.status === "moving").length;
    const offline = gpsVehicles.filter((v) => v.status === "offline").length;
    return [
      { name: "En ligne", value: online, color: "#22C55E" },
      { name: "En mouvement", value: moving, color: "#0EA5E9" },
      { name: "Arrêt", value: offline, color: "#EF4444" }
    ];
  }, [gpsVehicles]);

  const gpsDistanceByVehicle = useMemo(() => {
    return gpsVehicles
      .map((v) => ({
        name: v.name || v.plate || v.imei,
        distance: Math.round(v.distanceToday || 0),
        speed: Math.round(v.lastPosition?.speed || 0)
      }))
      .filter((d) => d.name)
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 10);
  }, [gpsVehicles]);

  const gpsTableData = useMemo(() => {
    return gpsVehicles
      .map((v) => ({
        id: v.id,
        name: v.name || v.plate || v.imei,
        plate: v.plate || v.imei,
        status: v.status,
        speed: Math.round(v.lastPosition?.speed || 0),
        distance: Math.round(v.distanceToday || 0)
      }))
      .sort((a, b) => b.speed - a.speed);
  }, [gpsVehicles]);

  const fuelAggregates = useMemo(() => {
    if (!fuelRecords.length) {
      return { totalQuantity: 0, totalCost: 0, averagePerFill: 0 };
    }
    const totalQuantity = fuelRecords.reduce((sum, r) => sum + (r.quantity || 0), 0);
    const totalCost = fuelRecords.reduce((sum, r) => sum + (r.price || 0), 0);
    const averagePerFill = totalQuantity / fuelRecords.length;
    return {
      totalQuantity: Math.round(totalQuantity),
      totalCost: Math.round(totalCost),
      averagePerFill: Math.round(averagePerFill)
    };
  }, [fuelRecords]);

  const fuelByMonth = useMemo(() => {
    const map: Record<string, { quantity: number; cost: number }> = {};
    fuelRecords.forEach((record) => {
      const d = new Date(record.date);
      const key = `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
      if (!map[key]) {
        map[key] = { quantity: 0, cost: 0 };
      }
      map[key].quantity += record.quantity || 0;
      map[key].cost += record.price || 0;
    });
    return Object.entries(map)
      .sort((a, b) => {
        const [ma, ya] = a[0].split("/").map(Number);
        const [mb, yb] = b[0].split("/").map(Number);
        if (ya === yb) return ma - mb;
        return ya - yb;
      })
      .map(([name, value]) => ({
        name,
        quantity: Math.round(value.quantity),
        cost: Math.round(value.cost)
      }));
  }, [fuelRecords]);

  const alertsBySeverity = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((e) => {
      const key = e.severity || "info";
      map[key] = (map[key] || 0) + 1;
    });
    return [
      { name: "Info", value: map.info || 0, color: "#0EA5E9" },
      { name: "Warning", value: map.warning || 0, color: "#F59E0B" },
      { name: "Critical", value: map.critical || 0, color: "#EF4444" }
    ];
  }, [events]);

  const recentEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }, [events]);

  const syncGpsAnalytics = async () => {
    try {
      const result = await refetchGps();
      if (result.error) {
        throw result.error;
      }
      toast.success("Analytics GPSwox synchronisées");
    } catch {
      toast.error("Erreur de synchronisation GPSwox");
    }
  };

  const loadGpsDetails = async () => {
    try {
      setGpsDetailsLoading(true);
      const [fuel, evt] = await Promise.all([
        gpswoxService.getFuelRecords(),
        gpswoxService.getEvents()
      ]);
      setFuelRecords(fuel);
      setEvents(evt);
    } catch {
      toast.error("Erreur lors du chargement des détails GPSwox");
    } finally {
      setGpsDetailsLoading(false);
    }
  };

  useEffect(() => {
    loadGpsDetails();
  }, []);

  const exportGpsPdf = () => {
    if (!gpsTableData.length) return;
    const doc = new jsPDF();
    const rows = gpsTableData.map((row) => [
      row.name,
      row.plate,
      row.status === "moving" ? "Mouvement" : row.status === "online" ? "En ligne" : "Arrêt",
      `${row.speed}`,
      `${row.distance}`
    ]);
    autoTable(doc, {
      head: [["Véhicule", "Plaque / IMEI", "Statut", "Vitesse km/h", "Distance jour km"]],
      body: rows
    });
    doc.save("gps-analytics.pdf");
  };

  const exportGpsCsv = () => {
    if (!gpsTableData.length) return;
    const header = ["Vehicule", "Plaque/IMEI", "Statut", "Vitesse_km_h", "Distance_jour_km"];
    const lines = gpsTableData.map((row) =>
      [
        row.name,
        row.plate,
        row.status === "moving" ? "Mouvement" : row.status === "online" ? "En ligne" : "Arrêt",
        row.speed,
        row.distance
      ].join(";")
    );
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gps-analytics.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Devices GPS</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{gpsStats.totalDevices}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>En ligne</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-green-600">
            {gpsStats.onlineDevices}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>En mouvement</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-sky-600">
            {gpsStats.movingDevices}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vitesse moyenne</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {gpsStats.averageSpeed} km/h
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={syncGpsAnalytics} disabled={gpsSyncing}>
          {gpsSyncing ? "Sync..." : "Sync GPSwox"}
        </Button>
      </div>

      <Tabs defaultValue="fleet">
        <TabsList className="mb-4">
          <TabsTrigger value="fleet">Flotte</TabsTrigger>
          <TabsTrigger value="financial">Finance</TabsTrigger>
          <TabsTrigger value="operational">Opérationnel</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Disponibilité de la flotte</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fleetAvailability} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70}>
                      {fleetAvailability.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Contrats par mois</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contractsPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Tendances des revenus</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operational">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              Analytics GPS basées sur les données en temps réel et l'historique Supabase
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportGpsPdf} disabled={!gpsTableData.length}>
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportGpsCsv} disabled={!gpsTableData.length}>
                Export Excel
              </Button>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Statut des véhicules GPS</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gpsStatusDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={70}
                    >
                      {gpsStatusDistribution.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top 10 distance parcourue aujourd'hui</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gpsDistanceByVehicle} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip />
                    <Bar dataKey="distance" fill="#0EA5E9" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Tableau des véhicules GPS</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left">Véhicule</th>
                    <th className="py-2 text-left">Plaque / IMEI</th>
                    <th className="py-2 text-left">Statut</th>
                    <th className="py-2 text-right">Vitesse</th>
                    <th className="py-2 text-right">Distance jour</th>
                  </tr>
                </thead>
                <tbody>
                  {gpsTableData.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-1">{row.name}</td>
                      <td className="py-1 text-muted-foreground">{row.plate}</td>
                      <td className="py-1">
                        {row.status === "moving"
                          ? "Mouvement"
                          : row.status === "online"
                            ? "En ligne"
                            : "Arrêt"}
                      </td>
                      <td className="py-1 text-right">{row.speed} km/h</td>
                      <td className="py-1 text-right">{row.distance} km</td>
                    </tr>
                  ))}
                  {!gpsTableData.length ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-muted-foreground">
                        Aucune donnée GPS disponible
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Consommation carburant GPS</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fuelByMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#22C55E" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                  <div>
                    <div className="font-semibold text-foreground">
                      {fuelAggregates.totalQuantity} L
                    </div>
                    <div>Total carburant</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {fuelAggregates.totalCost} MAD
                    </div>
                    <div>Coût total</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {fuelAggregates.averagePerFill} L
                    </div>
                    <div>Moyenne par remplissage</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Alertes GPS</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="60%">
                  <BarChart data={alertsBySeverity}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {alertsBySeverity.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 max-h-32 overflow-auto text-xs">
                  {recentEvents.map((e) => (
                    <div key={e.id} className="flex justify-between border-b last:border-0 py-1">
                      <div className="pr-2">
                        <div className="font-medium truncate max-w-[180px]">{e.title}</div>
                        <div className="text-muted-foreground truncate max-w-[220px]">
                          {e.message}
                        </div>
                      </div>
                      <div className="text-right text-muted-foreground">
                        <div>{new Date(e.date).toLocaleDateString()}</div>
                        <div>{new Date(e.date).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                  {!recentEvents.length ? (
                    <div className="text-muted-foreground text-center py-4">
                      Aucune alerte récente
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
