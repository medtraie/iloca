import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localStorageService, Vehicle } from "@/services/localStorageService";
import { fuelService } from "@/services/fuelService";
import { gpswoxService, GpswoxFuelRecord } from "@/services/gpswoxService";
import { toast } from "@/components/ui/sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";

export default function Fuel() {
  const vehicles = localStorageService.getAll<Vehicle>("vehicles");
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [gpsFuel, setGpsFuel] = useState<GpswoxFuelRecord[]>([]);
  const [form, setForm] = useState({ vehicleId: "", driver: "", quantity: "", price: "", station: "", date: "", odometer: "" });
  const logs = fuelService.all();
  const now = new Date();
  const monthlyCost = fuelService.monthlyCost(now.getFullYear(), now.getMonth());
  const cons = fuelService.consumptionPerVehicle(now.getFullYear(), now.getMonth());
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const dataBar = useMemo(() => {
    return Object.keys(cons).map((vid) => {
      const v = vehicles.find((x) => x.id === vid);
      const name = v ? `${v.marque || v.brand || ""} ${v.modele || v.model || ""}` : vid;
      return { name, liters: cons[vid] };
    });
  }, [cons.length, logs.length]);

  const totalLocalLiters = useMemo(() => {
    return Object.values(cons).reduce((sum, value) => sum + (value || 0), 0);
  }, [logs.length]);

  const topConsumer = useMemo(() => {
    let max = 0;
    let id = "";
    Object.keys(cons).forEach((k) => {
      if (cons[k] > max) {
        max = cons[k];
        id = k;
      }
    });
    const v = vehicles.find((x) => x.id === id);
    return { name: v ? `${v.marque || v.brand || ""} ${v.modele || v.model || ""}` : id, liters: max };
  }, [cons.length, logs.length]);

  const gpsDeviceBarData = useMemo(() => {
    const map: Record<string, { quantity: number; cost: number }> = {};
    gpsFuel.forEach((record) => {
      const key = record.deviceId || "Inconnu";
      if (!map[key]) {
        map[key] = { quantity: 0, cost: 0 };
      }
      map[key].quantity += record.quantity || 0;
      map[key].cost += record.price || 0;
    });
    return Object.entries(map).map(([deviceId, value]) => {
      const v =
        vehicles.find(
          (x) =>
            x.registration === deviceId ||
            x.immatriculation === deviceId ||
            x.id === deviceId
        ) || null;
      const name = v
        ? `${v.marque || v.brand || ""} ${v.modele || v.model || ""}`.trim() || deviceId
        : deviceId;
      return {
        name,
        liters: value.quantity,
        cost: value.cost
      };
    });
  }, [gpsFuel.length, vehicles.length]);

  const localMonthlyQuantity = useMemo(() => {
    const month = now.getMonth();
    const year = now.getFullYear();
    return logs
      .filter((entry) => {
        const d = new Date(entry.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, entry) => sum + (entry.quantity || 0), 0);
  }, [logs.length]);

  const gpsMonthlyStats = useMemo(() => {
    const month = now.getMonth();
    const year = now.getFullYear();
    let quantity = 0;
    let cost = 0;
    let count = 0;
    gpsFuel.forEach((record) => {
      const d = new Date(record.date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        quantity += record.quantity || 0;
        cost += record.price || 0;
        count += 1;
      }
    });
    return {
      quantity,
      cost,
      count
    };
  }, [gpsFuel.length]);

  const totalMonthlyQuantity = localMonthlyQuantity + gpsMonthlyStats.quantity;
  const totalMonthlyCost = monthlyCost + gpsMonthlyStats.cost;
  const totalMonthlyFills =
    logs.filter((entry) => {
      const d = new Date(entry.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length + gpsMonthlyStats.count;

  const averagePricePerLiter =
    totalMonthlyQuantity > 0 ? totalMonthlyCost / totalMonthlyQuantity : 0;

  const gpsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    gpsFuel.forEach((record) => {
      const d = new Date(record.date);
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + (record.quantity || 0);
    });
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, liters]) => ({
        date,
        liters: Math.round(liters)
      }));
  }, [gpsFuel]);

  const gpsByStation = useMemo(() => {
    const map: Record<string, number> = {};
    gpsFuel.forEach((record) => {
      const station = record.station || "Autre";
      map[station] = (map[station] || 0) + (record.quantity || 0);
    });
    return Object.entries(map).map(([name, liters]) => ({
      name,
      value: Math.round(liters)
    }));
  }, [gpsFuel]);

  const add = () => {
    if (!form.vehicleId || !form.quantity || !form.price || !form.date) {
      toast.error("Champs requis manquants");
      return;
    }
    fuelService.add({
      vehicleId: form.vehicleId,
      driver: form.driver || undefined,
      quantity: Number(form.quantity),
      price: Number(form.price),
      station: form.station || undefined,
      date: form.date,
      odometer: form.odometer ? Number(form.odometer) : undefined,
      id: "" as any,
    } as any);
    setOpen(false);
    toast.success("Enregistrement ajouté");
  };

  const syncGpsFuel = async () => {
    try {
      setSyncing(true);
      const records = await gpswoxService.getFuelRecords();
      setGpsFuel(records);
      toast.success("Carburant GPSwox synchronisé");
    } catch {
      toast.error("Erreur de synchronisation GPSwox");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Carburant</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un plein</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select onValueChange={(v) => setForm((f) => ({ ...f, vehicleId: v }))} value={form.vehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {(v.marque || v.brand || "") + " " + (v.modele || v.model || "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Chauffeur/Agent" value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} />
              <Input placeholder="Quantité (L)" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              <Input placeholder="Prix (DH)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Input placeholder="Station" value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} />
              <Input placeholder="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <Input placeholder="Compteur (km)" type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={add}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={syncGpsFuel} disabled={syncing}>
          {syncing ? "Sync..." : "Sync GPSwox"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Carburant total (mois courant)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {Math.round(totalMonthlyQuantity)} L
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Coût GPS (mois courant)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-600">
            {Math.round(gpsMonthlyStats.cost).toLocaleString()} DH
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Prix moyen / L (local + GPS)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {averagePricePerLiter.toFixed(2)} DH
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Litres (mois courant)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {Math.round(totalMonthlyQuantity).toLocaleString()} L
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Coût total (mois courant)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {Math.round(totalMonthlyCost).toLocaleString()} DH
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Nombre de pleins</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {totalMonthlyFills.toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top consommateur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">{topConsumer.name}</div>
            <div className="text-xs text-muted-foreground">
              {Math.round(topConsumer.liters || 0).toLocaleString()} L ce mois
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Consommation par véhicule (mois courant)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataBar}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="liters" fill="#22C55E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Coût mensuel</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-4xl font-bold">
            {totalMonthlyCost.toLocaleString()} DH
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consommation GPS par appareil</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gpsDeviceBarData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="liters" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top consommateur (local)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="text-sm text-muted-foreground">Mois courant</div>
            <div className="text-2xl font-bold">{topConsumer.name}</div>
            <div className="text-lg text-emerald-600">{topConsumer.liters} L</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Carburant GPSwox par jour</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gpsByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="liters" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition GPSwox par station</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gpsByStation} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70}>
                  {gpsByStation.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={["#22C55E", "#0EA5E9", "#F59E0B", "#EF4444", "#6366F1"][index % 5]}
                    />
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
          <CardTitle>Enregistrements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-sm font-medium text-muted-foreground">
            <div>Véhicule</div>
            <div>Chauffeur</div>
            <div>Quantité</div>
            <div>Prix</div>
            <div>Station</div>
            <div>Date</div>
            <div>Compteur</div>
          </div>
          <div className="divide-y mt-2">
            {logs.map((l) => {
              const v = vehicles.find((x) => x.id === l.vehicleId);
              return (
                <div key={l.id} className="grid grid-cols-7 gap-2 py-2 text-sm">
                  <div>{v ? `${v.marque || v.brand || ""} ${v.modele || v.model || ""}` : l.vehicleId}</div>
                  <div>{l.driver || "-"}</div>
                  <div>{l.quantity} L</div>
                  <div>{l.price} DH</div>
                  <div>{l.station || "-"}</div>
                  <div>{new Date(l.date).toLocaleDateString()}</div>
                  <div>{l.odometer ? `${l.odometer} km` : "-"}</div>
                </div>
              );
            })}
            {gpsFuel.map((record) => (
              <div key={record.id} className="grid grid-cols-7 gap-2 py-2 text-sm">
                <div>{record.deviceId}</div>
                <div>GPSwox</div>
                <div>{record.quantity} L</div>
                <div>{record.price || 0} DH</div>
                <div>{record.station || "-"}</div>
                <div>{new Date(record.date).toLocaleDateString()}</div>
                <div>-</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
