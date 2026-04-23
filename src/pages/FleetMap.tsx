import { useMemo, useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGPSwoxVehicles } from "@/hooks/useGPSwoxVehicles";
import { useGPSwoxHistory } from "@/hooks/useGPSwoxHistory";
import { toast } from "@/components/ui/sonner";
import { Search, RefreshCw, MapPin, Gauge, Wifi, WifiOff, Battery, Fuel, Clock3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const statusColor = (s: "online" | "moving" | "offline") => {
  if (s === "moving") return "#1d9bf0"; // أزرق - Mouvement
  if (s === "online") return "#22c55e"; // أخضر - En ligne
  return "#ef4444"; // أحمر - Arrêt
};

const statusLabel = (s: "online" | "moving" | "offline") => {
  if (s === "moving") return "Mouvement";
  if (s === "online") return "En ligne";
  return "Arrêt";
};

export default function FleetMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "moving" | "offline">("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);

  // استخدام الـ hook مع تحديث كل 30 ثانية
  const { data: vehicles = [], error, refetch, isFetching } = useGPSwoxVehicles(30000);
  const { data: historyPoints = [] } = useGPSwoxHistory(selectedId || null, 40);

  const refreshGps = async () => {
    await refetch();
    if (!error) {
      toast.success("Données GPSwox synchronisées");
    } else {
      toast.error("Synchronisation GPSwox échouée");
    }
  };

  const allGpsItems = useMemo(() => {
    return vehicles.map((v) => {
      const label = v.name || `${v.brand || ""} ${v.model || ""}`.trim() || v.raw?.name || "Véhicule";
      const plateText = v.plate || v.imei || "-";
      const hasPosition = v.lastPosition?.lat !== undefined && v.lastPosition?.lng !== undefined;
      
      return {
        id: v.id,
        label,
        plateText,
        status: v.status,
        online: v.status === "online" || v.status === "moving",
        moving: v.status === "moving",
        speed: v.lastPosition?.speed || 0,
        last: v.lastPosition,
        hasPosition,
        fuel: v.fuelQuantity,
        battery: v.battery,
        distanceToday: v.distanceToday
      };
    });
  }, [vehicles]);

  const stats = useMemo(() => {
    const total = allGpsItems.length;
    const online = allGpsItems.filter((item) => item.status === "online" || item.status === "moving").length;
    const moving = allGpsItems.filter((item) => item.status === "moving").length;
    const offline = allGpsItems.filter((item) => item.status === "offline").length;
    const avgSpeed =
      allGpsItems.length > 0
        ? Math.round(
            allGpsItems.reduce((sum, item) => sum + (item.speed || 0), 0) / allGpsItems.length
          )
        : 0;
    const totalDistanceToday = Math.round(
      allGpsItems.reduce((sum, item) => sum + (item.distanceToday || 0), 0)
    );
    return { total, online, moving, offline, avgSpeed, totalDistanceToday };
  }, [allGpsItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allGpsItems.filter((item) => {
      const byFilter =
        filter === "all"
          ? true
          : filter === "online"
            ? item.status === "online" || item.status === "moving"
            : filter === "moving"
              ? item.status === "moving"
              : item.status === "offline";
      const byText =
        !q ||
        item.label.toLowerCase().includes(q) ||
        item.plateText.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);
      return byFilter && byText;
    });
  }, [allGpsItems, filter, search]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const center: L.LatLngExpression = [33.5731, -7.5898];
    const map = L.map(ref.current, { center, zoom: 11 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }).addTo(map);
    const markersLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersRef.current = markersLayer;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      if (pathRef.current) {
        pathRef.current.remove();
        pathRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    
    filteredItems.forEach(({ id, label, plateText, last, status, speed, hasPosition }) => {
      if (!hasPosition || !last) return;
      
      const color = statusColor(status);
      const size = selectedId === id ? 26 : 22;
      const inner = size - 8;
      const iconHtml = `
        <div style="position:relative;transform:translate(-50%, -50%);">
          <div style="
            width:${size}px;
            height:${size}px;
            background:${color};
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 2px 6px rgba(0,0,0,0.35);
          "></div>
          <div style="
            position:absolute;
            top:${(size - inner) / 2}px;
            left:${(size - inner) / 2}px;
            width:${inner}px;
            height:${inner}px;
            border-radius:50%;
            background:#ffffff;
          "></div>
          <div style="
            position:absolute;
            top:${(size - inner) / 2 + 3}px;
            left:${(size - inner) / 2 + 3}px;
            width:${inner - 6}px;
            height:${inner - 6}px;
            border-radius:50%;
            background:${color};
          "></div>
        </div>
      `;

      const icon = L.divIcon({
        className: "gps-marker",
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size]
      });
      
      const marker = L.marker([last.lat, last.lng], {
        icon,
        title: label
      });
      
      marker.bindPopup(
        `<div style="min-width:200px">
          <div style="font-weight:600">${label}</div>
          <div>${plateText}</div>
          <div>Statut: ${statusLabel(status)}</div>
          <div>Vitesse: ${speed ?? "-"} km/h</div>
          <div>Dernière position: ${last.lat.toFixed(4)}, ${last.lng.toFixed(4)}</div>
          <div>Maj: ${new Date(last.timestamp).toLocaleString()}</div>
        </div>`
      );
      
      marker.on("click", () => setSelectedId(id));
      marker.addTo(layer);
    });
    
    if (filteredItems.length) {
      const validItems = filteredItems.filter(i => i.hasPosition && i.last);
      if (validItems.length > 0) {
        const bounds = L.latLngBounds(validItems.map((item) => [item.last!.lat, item.last!.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
      }
    }
  }, [filteredItems, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const item = filteredItems.find((entry) => entry.id === selectedId);
    if (!item || !item.hasPosition || !item.last) return;
    map.flyTo([item.last.lat, item.last.lng], Math.max(map.getZoom(), 13), { duration: 0.5 });
  }, [filteredItems, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pathRef.current) {
      pathRef.current.remove();
      pathRef.current = null;
    }
    if (!selectedId || !historyPoints.length) return;
    const coords = historyPoints
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => [p.lat, p.lng] as [number, number]);
    if (coords.length < 2) return;
    const polyline = L.polyline(coords, {
      color: "#0ea5e9",
      weight: 3,
      opacity: 0.8
    });
    polyline.addTo(map);
    pathRef.current = polyline;
  }, [historyPoints, selectedId]);

  return (
    <Card className="h-[78vh] border-0 shadow-none">
      <CardHeader className="flex flex-col items-center justify-center gap-3 pb-3">
        <CardTitle className="text-xl font-semibold">Map GPSwox Live</CardTitle>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button variant="outline" onClick={refreshGps} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Sync..." : "Sync GPSwox"}
          </Button>
          <div className="flex gap-1 rounded-full bg-muted px-1 py-1">
            <Button
              size="sm"
              variant={viewMode === "cards" ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setViewMode("cards")}
            >
              Liste
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setViewMode("table")}
            >
              Tableau
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-full grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">
        <div className="relative h-[60vh] lg:h-full rounded-2xl border overflow-hidden bg-muted">
          <div className="absolute z-[500] left-3 top-3 flex flex-wrap gap-2">
            <div className="px-2 py-1 rounded-full bg-black/75 text-white text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" /> En direct: {stats.total}
            </div>
            <div className="px-2 py-1 rounded-full bg-emerald-600 text-white text-xs flex items-center gap-1">
              <Wifi className="h-3 w-3" /> En ligne: {stats.online}
            </div>
            <div className="px-2 py-1 rounded-full bg-sky-600 text-white text-xs flex items-center gap-1">
              <Gauge className="h-3 w-3" /> En mouvement: {stats.moving}
            </div>
            <div className="px-2 py-1 rounded-full bg-rose-600 text-white text-xs flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> Arrêt: {stats.offline}
            </div>
          </div>
          {error ? (
            <div className="absolute z-[500] left-3 bottom-3 px-2 py-1 rounded-md bg-amber-500/90 text-white text-xs">
              GPSwox Error: {error.message}
            </div>
          ) : null}
          <div ref={ref} className="h-full w-full" />
        </div>
        <div className="h-[60vh] lg:h-full rounded-2xl border bg-card overflow-hidden flex flex-col">
          <div className="p-3 border-b space-y-2">
            <div className="font-semibold flex items-center justify-between gap-2">
              <span>Véhicules</span>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Gauge className="h-3 w-3" />
                  <span>Vitesse moy.: {stats.avgSpeed} km/h</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>Distance jour: {stats.totalDistanceToday} km</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher IMEI ou plaque..."
                className="w-full h-9 rounded-md border bg-background pl-8 pr-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Tous {stats.total}</Button>
              <Button size="sm" variant={filter === "online" ? "default" : "outline"} onClick={() => setFilter("online")}>En ligne {stats.online}</Button>
              <Button size="sm" variant={filter === "moving" ? "default" : "outline"} onClick={() => setFilter("moving")}>Mouvement {stats.moving}</Button>
              <Button size="sm" variant={filter === "offline" ? "default" : "outline"} onClick={() => setFilter("offline")}>Arrêt {stats.offline}</Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {viewMode === "cards" ? (
              <>
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left rounded-md border p-2 transition-transform duration-150 ${
                      selectedId === item.id
                        ? "border-primary bg-primary/5 shadow-sm scale-[1.01]"
                        : "hover:bg-muted/50 hover:scale-[1.01]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{item.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.plateText}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            item.status === "moving"
                              ? "bg-sky-100 text-sky-700"
                              : item.online
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {statusLabel(item.status)}
                        </div>
                        <div className="text-[11px] flex items-center gap-1 text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          {item.last
                            ? new Date(item.last.timestamp).toLocaleTimeString()
                            : "-"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            Vitesse
                          </span>
                          <span>{item.speed} km/h</span>
                        </div>
                        {typeof item.fuel === "number" ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Fuel className="h-3 w-3" />
                                Carburant
                              </span>
                              <span>{Math.round(item.fuel)}%</span>
                            </div>
                            <Progress value={Math.max(0, Math.min(100, item.fuel))} />
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        {typeof item.battery === "number" ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Battery className="h-3 w-3" />
                                Batterie
                              </span>
                              <span>{Math.round(item.battery)}%</span>
                            </div>
                            <Progress
                              value={Math.max(0, Math.min(100, item.battery))}
                              className="bg-slate-200"
                            />
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                          <span>Distance jour</span>
                          <span>{Math.round(item.distanceToday || 0)} km</span>
                        </div>
                      </div>
                    </div>
                    {!item.hasPosition ? (
                      <div className="text-[11px] text-amber-600 mt-2">
                        Position GPS absente
                      </div>
                    ) : null}
                  </button>
                ))}
              </>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>IMEI / Plaque</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Vitesse</TableHead>
                    <TableHead>Distance jour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      data-state={selectedId === item.id ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(item.id)}
                    >
                      <TableCell className="font-medium">{item.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.plateText}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            item.status === "moving"
                              ? "bg-sky-100 text-sky-700"
                              : item.online
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{item.speed} km/h</TableCell>
                      <TableCell className="text-xs">
                        {Math.round(item.distanceToday || 0)} km
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredItems.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground py-6"
                      >
                        Aucune donnée GPS disponible
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            )}
            {selectedId && historyPoints.length > 0 ? (
              <div className="mt-3 border-t pt-3">
                <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  <span>Derniers mouvements</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-auto pr-1">
                  {historyPoints
                    .slice()
                    .reverse()
                    .map((p) => (
                      <div
                        key={`${p.timestamp}-${p.lat}-${p.lng}`}
                        className="flex items-center justify-between text-[11px] text-muted-foreground"
                      >
                        <span>{new Date(p.timestamp).toLocaleTimeString()}</span>
                        <span>
                          {p.speed} km/h • {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
