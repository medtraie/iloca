import { useMemo, useRef, useState, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "@/components/ui/sonner";
import { useGPSwoxVehicles } from "@/hooks/useGPSwoxVehicles";
import { useGPSwoxHistory } from "@/hooks/useGPSwoxHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Battery,
  Clock3,
  Focus,
  Gauge,
  Layers,
  LocateFixed,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  Fuel,
  Route
} from "lucide-react";

type MapTheme = "osm" | "light" | "dark" | "satellite";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const formatAgo = (timestamp: number | undefined) => {
  if (!timestamp || !Number.isFinite(timestamp)) return "-";
  const diffMs = Date.now() - timestamp;
  const s = Math.max(0, Math.floor(diffMs / 1000));
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
};

const statusMeta = (s: "online" | "moving" | "offline") => {
  if (s === "moving") {
    return { label: "Mouvement", color: "#0ea5e9", badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200" };
  }
  if (s === "online") {
    return { label: "En ligne", color: "#22c55e", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" };
  }
  return { label: "Arrêt", color: "#ef4444", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200" };
};

const tileCatalog: Record<MapTheme, { label: string; url: string; attribution: string; maxZoom: number }> = {
  osm: {
    label: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  },
  light: {
    label: "Clair",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20
  },
  dark: {
    label: "Sombre",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19
  }
};

function buildMarkerIcon(color: string, selected: boolean) {
  const size = selected ? 30 : 24;
  const dot = selected ? 10 : 9;
  const html = `
    <div style="position:relative;transform:translate(-50%, -50%);">
      <div style="
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 10px 25px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.25);
        filter:saturate(1.05);
      "></div>
      <div style="
        position:absolute;
        top:${(size - dot) / 2}px;
        left:${(size - dot) / 2}px;
        width:${dot}px;
        height:${dot}px;
        border-radius:9999px;
        background:rgba(255,255,255,0.95);
        box-shadow:0 1px 2px rgba(0,0,0,0.12) inset;
      "></div>
    </div>
  `;
  return L.divIcon({
    className: "gps-marker-2026",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  });
}

export default function FleetMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const historyLineRef = useRef<L.Polyline | null>(null);
  const traceLineRef = useRef<L.Polyline | null>(null);
  const traceMarkerRef = useRef<L.Marker | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const playbackIndexRef = useRef(0);
  const iconCacheRef = useRef<Map<string, L.DivIcon>>(new Map());
  const userMovedRef = useRef(false);
  const autoFitDoneRef = useRef(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "moving" | "offline">("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [panelTab, setPanelTab] = useState<"liste" | "tableau">("liste");
  const [mapTheme, setMapTheme] = useState<MapTheme>("light");
  const [followSelected, setFollowSelected] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(160);

  const { data: vehicles = [], error, refetch, isFetching } = useGPSwoxVehicles(30000);
  const { data: historyPoints = [] } = useGPSwoxHistory(selectedId || null, 60);

  const items = useMemo(() => {
    return vehicles.map((v) => {
      const label = v.name || `${v.brand || ""} ${v.model || ""}`.trim() || v.raw?.name || "Véhicule";
      const plateText = v.plate || v.imei || "-";
      const hasPosition = Number.isFinite(v.lastPosition?.lat) && Number.isFinite(v.lastPosition?.lng);
      const last = v.lastPosition;
      const meta = statusMeta(v.status);
      const isOnline = v.status === "online" || v.status === "moving";
      return {
        id: v.id,
        label,
        plateText,
        status: v.status,
        statusLabel: meta.label,
        statusColor: meta.color,
        statusBadge: meta.badge,
        isOnline,
        speed: last?.speed || 0,
        last,
        hasPosition,
        fuel: v.fuelQuantity,
        battery: v.battery,
        distanceToday: v.distanceToday || 0,
        city: v.lastPosition?.city || ""
      };
    });
  }, [vehicles]);

  const stats = useMemo(() => {
    const total = items.length;
    const online = items.filter((i) => i.status === "online" || i.status === "moving").length;
    const moving = items.filter((i) => i.status === "moving").length;
    const offline = items.filter((i) => i.status === "offline").length;
    const avgSpeed = total ? Math.round(items.reduce((sum, i) => sum + (i.speed || 0), 0) / total) : 0;
    const totalDistanceToday = Math.round(items.reduce((sum, i) => sum + (i.distanceToday || 0), 0));
    return { total, online, moving, offline, avgSpeed, totalDistanceToday };
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
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
        item.id.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q);
      return byFilter && byText;
    });
  }, [filter, items, search]);

  const selectedItem = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);

  const historyCoords = useMemo(() => {
    return historyPoints
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => [p.lat, p.lng] as [number, number]);
  }, [historyPoints]);

  const refreshGps = async () => {
    await refetch();
    if (!error) toast.success("Données GPSwox synchronisées");
    else toast.error("Synchronisation GPSwox échouée");
  };

  const stopPlayback = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlaying(false);
    playbackIndexRef.current = 0;
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;
    if (traceLineRef.current) {
      traceLineRef.current.remove();
      traceLineRef.current = null;
    }
    if (traceMarkerRef.current) {
      traceMarkerRef.current.remove();
      traceMarkerRef.current = null;
    }
  };

  const fitToVisible = () => {
    const map = mapRef.current;
    if (!map) return;
    const valid = visibleItems.filter((i) => i.hasPosition && i.last);
    if (!valid.length) return;
    const bounds = L.latLngBounds(valid.map((i) => [i.last!.lat, i.last!.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
  };

  const focusSelected = () => {
    const map = mapRef.current;
    if (!map || !selectedItem?.hasPosition || !selectedItem.last) return;
    map.flyTo([selectedItem.last.lat, selectedItem.last.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  };

  const togglePlayback = () => {
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;
    if (!selectedId || historyCoords.length < 2) {
      toast.error("Historique insuffisant pour l'animation");
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      return;
    }

    setIsPlaying(true);

    if (playbackIndexRef.current >= historyCoords.length - 1) {
      playbackIndexRef.current = 0;
    }

    const start = historyCoords[playbackIndexRef.current];

    if (!traceMarkerRef.current) {
      traceMarkerRef.current = L.marker(start, {
        icon: buildMarkerIcon("#111827", true),
        zIndexOffset: 1000
      }).addTo(overlay);
    } else {
      traceMarkerRef.current.setLatLng(start);
      traceMarkerRef.current.addTo(overlay);
    }

    if (!traceLineRef.current) {
      traceLineRef.current = L.polyline(historyCoords.slice(0, playbackIndexRef.current + 1), {
        color: "#111827",
        weight: 5,
        opacity: 0.8,
        lineCap: "round"
      }).addTo(overlay);
    } else {
      traceLineRef.current.setLatLngs(historyCoords.slice(0, playbackIndexRef.current + 1));
      traceLineRef.current.addTo(overlay);
    }

    map.panTo(start, { animate: true, duration: 0.3 });

    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    playbackTimerRef.current = window.setInterval(() => {
      if (playbackIndexRef.current >= historyCoords.length - 1) {
        stopPlayback();
        return;
      }
      playbackIndexRef.current += 1;
      const next = historyCoords[playbackIndexRef.current];
      if (traceMarkerRef.current) traceMarkerRef.current.setLatLng(next);
      if (traceLineRef.current) traceLineRef.current.setLatLngs(historyCoords.slice(0, playbackIndexRef.current + 1));
      if (followSelected) map.panTo(next, { animate: true, duration: 0.25 });
    }, clamp(playSpeedMs, 80, 600));
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const center: L.LatLngExpression = [33.5731, -7.5898];
    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 11,
      zoomControl: false
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.on("dragstart", () => {
      userMovedRef.current = true;
    });
    map.on("zoomstart", () => {
      userMovedRef.current = true;
    });

    const theme = tileCatalog[mapTheme];
    const tile = L.tileLayer(theme.url, { attribution: theme.attribution, maxZoom: theme.maxZoom });
    tile.addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const overlayLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileRef.current = tile;
    markersLayerRef.current = markersLayer;
    overlayLayerRef.current = overlayLayer;

    return () => {
      stopPlayback();
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      markersLayerRef.current = null;
      overlayLayerRef.current = null;
      historyLineRef.current = null;
      traceLineRef.current = null;
      traceMarkerRef.current = null;
      iconCacheRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const old = tileRef.current;
    if (old) old.remove();
    const theme = tileCatalog[mapTheme];
    const tile = L.tileLayer(theme.url, { attribution: theme.attribution, maxZoom: theme.maxZoom });
    tile.addTo(map);
    tileRef.current = tile;
  }, [mapTheme]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    visibleItems.forEach((item) => {
      if (!item.hasPosition || !item.last) return;
      const key = `${item.statusColor}|${item.id === selectedId ? "sel" : "n"}`;
      const cached = iconCacheRef.current.get(key);
      const icon = cached || buildMarkerIcon(item.statusColor, item.id === selectedId);
      if (!cached) iconCacheRef.current.set(key, icon);

      const marker = L.marker([item.last.lat, item.last.lng], {
        icon,
        title: item.label
      });
      marker.on("click", () => setSelectedId(item.id));
      marker.addTo(layer);
    });

    if (!autoFitDoneRef.current && !userMovedRef.current) {
      fitToVisible();
      autoFitDoneRef.current = true;
    }
  }, [selectedId, visibleItems]);

  useEffect(() => {
    if (!selectedItem) return;
    stopPlayback();
    focusSelected();
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;
    if (historyLineRef.current) {
      historyLineRef.current.remove();
      historyLineRef.current = null;
    }
    if (!selectedId || historyCoords.length < 2) return;
    historyLineRef.current = L.polyline(historyCoords, {
      color: "#0ea5e9",
      weight: 3,
      opacity: 0.85,
      lineCap: "round"
    }).addTo(overlay);
  }, [historyCoords, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!followSelected || !selectedItem?.hasPosition || !selectedItem.last) return;
    if (isPlaying) return;
    map.panTo([selectedItem.last.lat, selectedItem.last.lng], { animate: true, duration: 0.25 });
  }, [followSelected, isPlaying, selectedItem?.last?.lat, selectedItem?.last?.lng]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  return (
    <Card className="border-0 shadow-none safe-pt safe-pb">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">Carte (GPSwox Live)</CardTitle>
            <div className="text-xs text-muted-foreground">
              Vue temps réel, filtres avancés, détails, historique et lecture animée du trajet.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={refreshGps} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "Sync..." : "Sync GPSwox"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Layers className="mr-2 h-4 w-4" />
                  Fond: {tileCatalog[mapTheme].label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(tileCatalog).map(([key, meta]) => (
                  <DropdownMenuItem key={key} onClick={() => setMapTheme(key as MapTheme)}>
                    {meta.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={fitToVisible} disabled={!visibleItems.length}>
              <Focus className="mr-2 h-4 w-4" />
              Ajuster
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 lg:grid-cols-[1fr_420px]">
        <div className="relative overflow-hidden rounded-3xl border bg-muted h-[40vh] lg:h-[calc(100dvh-16rem)]">
          <div className="absolute left-3 top-3 z-[600] flex flex-wrap gap-2">
            <div className="rounded-full bg-black/70 text-white text-[11px] px-2.5 py-1 inline-flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">En direct</span>
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="rounded-full bg-emerald-600 text-white text-[11px] px-2.5 py-1 inline-flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">En ligne</span>
              <span className="font-semibold">{stats.online}</span>
            </div>
            <div className="rounded-full bg-sky-600 text-white text-[11px] px-2.5 py-1 inline-flex items-center gap-2">
              <Gauge className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">Mouvement</span>
              <span className="font-semibold">{stats.moving}</span>
            </div>
            <div className="rounded-full bg-rose-600 text-white text-[11px] px-2.5 py-1 inline-flex items-center gap-2">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">Arrêt</span>
              <span className="font-semibold">{stats.offline}</span>
            </div>
          </div>

          <div className="absolute right-3 top-3 z-[600] flex items-center gap-2 rounded-2xl border bg-background/80 backdrop-blur px-3 py-2 shadow-sm">
            <div className="text-xs text-muted-foreground">Follow</div>
            <Switch checked={followSelected} onCheckedChange={(v) => setFollowSelected(v)} />
            <Button size="icon" variant="ghost" onClick={focusSelected} disabled={!selectedItem?.hasPosition}>
              <LocateFixed className="h-4 w-4" />
            </Button>
          </div>

          {error ? (
            <div className="absolute left-3 bottom-3 z-[600] rounded-2xl border bg-amber-500/90 text-white px-3 py-2 text-xs max-w-[calc(100%-1.5rem)]">
              GPSwox Error: {error.message}
            </div>
          ) : null}

          <div ref={mapContainerRef} className="h-full w-full" />
        </div>

        <div className="rounded-3xl border bg-card overflow-hidden flex flex-col h-[48vh] lg:h-[calc(100dvh-16rem)]">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="font-semibold">Véhicules</div>
                <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> Vitesse moy.: {stats.avgSpeed} km/h
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Route className="h-3 w-3" /> Distance jour: {stats.totalDistanceToday} km
                  </span>
                </div>
              </div>
              <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as any)} className="shrink-0">
                <TabsList className="h-9">
                  <TabsTrigger value="liste" className="text-xs">Liste</TabsTrigger>
                  <TabsTrigger value="tableau" className="text-xs">Tableau</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher: IMEI, plaque, nom, ville..."
                className="pl-8"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
                Tous <span className="ml-2 text-xs opacity-80">{stats.total}</span>
              </Button>
              <Button size="sm" variant={filter === "online" ? "default" : "outline"} onClick={() => setFilter("online")}>
                En ligne <span className="ml-2 text-xs opacity-80">{stats.online}</span>
              </Button>
              <Button size="sm" variant={filter === "moving" ? "default" : "outline"} onClick={() => setFilter("moving")}>
                Mouvement <span className="ml-2 text-xs opacity-80">{stats.moving}</span>
              </Button>
              <Button size="sm" variant={filter === "offline" ? "default" : "outline"} onClick={() => setFilter("offline")}>
                Arrêt <span className="ml-2 text-xs opacity-80">{stats.offline}</span>
              </Button>
            </div>

            {selectedItem ? (
              <div className="rounded-2xl border bg-muted/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-semibold">{selectedItem.label}</div>
                      <Badge className={selectedItem.statusBadge}>{selectedItem.statusLabel}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {selectedItem.plateText} {selectedItem.city ? `• ${selectedItem.city}` : ""}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <div className="rounded-xl border bg-background/70 px-2 py-1">
                        <div className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" /> {selectedItem.speed} km/h
                        </div>
                      </div>
                      <div className="rounded-xl border bg-background/70 px-2 py-1">
                        <div className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3" /> {formatAgo(selectedItem.last?.timestamp)}
                        </div>
                      </div>
                      <div className="rounded-xl border bg-background/70 px-2 py-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {Math.round(selectedItem.distanceToday)} km
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={focusSelected} disabled={!selectedItem.hasPosition}>
                      <LocateFixed className="mr-2 h-4 w-4" />
                      Centrer
                    </Button>
                    <Button size="sm" onClick={togglePlayback} variant={isPlaying ? "destructive" : "default"} disabled={historyCoords.length < 2}>
                      {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                      {isPlaying ? "Pause" : "Lecture"}
                    </Button>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button size="sm" variant="outline">
                          Détails
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right" className="w-full sm:max-w-lg">
                        <SheetHeader>
                          <SheetTitle>Détails véhicule</SheetTitle>
                        </SheetHeader>
                        <div className="mt-4 space-y-4">
                          <div className="rounded-2xl border p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold truncate">{selectedItem.label}</div>
                              <Badge className={selectedItem.statusBadge}>{selectedItem.statusLabel}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{selectedItem.plateText}</div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Dernière maj</div>
                                <div className="font-medium">{selectedItem.last ? new Date(selectedItem.last.timestamp).toLocaleString() : "-"}</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Coordonnées</div>
                                <div className="font-medium">
                                  {selectedItem.last ? `${selectedItem.last.lat.toFixed(5)}, ${selectedItem.last.lng.toFixed(5)}` : "-"}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Vitesse</div>
                                <div className="font-medium">{selectedItem.speed} km/h</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Distance jour</div>
                                <div className="font-medium">{Math.round(selectedItem.distanceToday)} km</div>
                              </div>
                            </div>
                            <div className="grid gap-3">
                              {typeof selectedItem.battery === "number" ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1"><Battery className="h-3.5 w-3.5" /> Batterie</span>
                                    <span>{Math.round(selectedItem.battery)}%</span>
                                  </div>
                                  <Progress value={clamp(selectedItem.battery, 0, 100)} />
                                </div>
                              ) : null}
                              {typeof selectedItem.fuel === "number" ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1"><Fuel className="h-3.5 w-3.5" /> Carburant</span>
                                    <span>{Math.round(selectedItem.fuel)}%</span>
                                  </div>
                                  <Progress value={clamp(selectedItem.fuel, 0, 100)} />
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="rounded-2xl border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-sm">Lecture animée (Traceur)</div>
                              <Button size="sm" variant="outline" onClick={() => { stopPlayback(); togglePlayback(); }} disabled={historyCoords.length < 2}>
                                Rejouer
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground">Vitesse</div>
                              <Slider
                                value={[playSpeedMs]}
                                min={80}
                                max={600}
                                step={20}
                                onValueChange={(v) => setPlaySpeedMs(v[0] || 160)}
                              />
                              <div className="text-xs text-muted-foreground">{playSpeedMs} ms / étape</div>
                            </div>
                          </div>

                          <div className="rounded-2xl border p-4">
                            <div className="font-semibold text-sm mb-2">Derniers points</div>
                            {historyPoints.length ? (
                              <ScrollArea className="h-64 pr-3">
                                <div className="space-y-2">
                                  {historyPoints
                                    .slice()
                                    .reverse()
                                    .map((p) => (
                                      <div key={`${p.timestamp}-${p.lat}-${p.lng}`} className="rounded-xl border bg-background/60 px-3 py-2">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                          <span>{new Date(p.timestamp).toLocaleTimeString()}</span>
                                          <span>{p.speed} km/h</span>
                                        </div>
                                        <div className="text-xs mt-1">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</div>
                                      </div>
                                    ))}
                                </div>
                              </ScrollArea>
                            ) : (
                              <div className="text-sm text-muted-foreground">Aucun historique disponible.</div>
                            )}
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as any)} className="flex-1 overflow-hidden">
            <TabsContent value="liste" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left rounded-2xl border p-3 transition ${
                        selectedId === item.id ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: item.statusColor }} />
                            <div className="font-medium truncate">{item.label}</div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{item.plateText}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${item.statusBadge}`}>{item.statusLabel}</span>
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" /> {formatAgo(item.last?.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                        <div className="rounded-xl border bg-background/60 px-2 py-1 inline-flex items-center gap-1">
                          <Gauge className="h-3 w-3" /> {item.speed} km/h
                        </div>
                        <div className="rounded-xl border bg-background/60 px-2 py-1 inline-flex items-center gap-1">
                          <Route className="h-3 w-3" /> {Math.round(item.distanceToday)} km
                        </div>
                        <div className="rounded-xl border bg-background/60 px-2 py-1 inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {item.city || "-"}
                        </div>
                      </div>
                      {!item.hasPosition ? (
                        <div className="mt-2 text-[11px] text-amber-600">Position GPS absente</div>
                      ) : null}
                    </button>
                  ))}
                  {!visibleItems.length ? (
                    <div className="text-center text-sm text-muted-foreground py-10">Aucune donnée GPS disponible</div>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="tableau" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground px-2">
                    <div className="col-span-2">Véhicule</div>
                    <div>Statut</div>
                    <div>Vitesse</div>
                    <div>Maj</div>
                  </div>
                  <Separator />
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-2xl border px-3 py-2 transition ${
                        selectedId === item.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="grid grid-cols-5 gap-2 items-center text-sm">
                        <div className="col-span-2 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: item.statusColor }} />
                            <span className="truncate font-medium">{item.label}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{item.plateText}</div>
                        </div>
                        <div className="text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${item.statusBadge}`}>{item.statusLabel}</span>
                        </div>
                        <div className="text-xs">{item.speed} km/h</div>
                        <div className="text-xs text-muted-foreground">{formatAgo(item.last?.timestamp)}</div>
                      </div>
                    </button>
                  ))}
                  {!visibleItems.length ? (
                    <div className="text-center text-sm text-muted-foreground py-10">Aucune donnée GPS disponible</div>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
