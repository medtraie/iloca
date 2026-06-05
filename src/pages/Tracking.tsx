import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { gpswoxService } from "@/services/gpswoxService";
import { useGPSwoxVehiclesOnly, GPSwoxDevice } from "@/hooks/useGPSwoxVehiclesOnly";
import {
  Compass,
  Download,
  FileText,
  Focus,
  Layers,
  LocateFixed,
  Pause,
  Play,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  TimerReset
} from "lucide-react";

type HistoryPoint = { lat: number; lng: number; timestamp: number; speed?: number };
type MapTheme = "osm" | "light" | "dark" | "satellite";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

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

const formatAgo = (timestamp: number | undefined) => {
  if (!timestamp || !Number.isFinite(timestamp)) return "—";
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

const toIsoRange = (from: Date | undefined, to: Date | undefined) => {
  const fromIso = (from || new Date(Date.now() - 24 * 3600 * 1000)).toISOString();
  const toIso = (to || new Date()).toISOString();
  return { fromIso, toIso };
};

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

const computeRouteStats = (points: HistoryPoint[]) => {
  if (points.length < 2) {
    return { distanceKm: 0, durationMin: 0, avgSpeed: 0, maxSpeed: 0, stops: 0 };
  }
  const sorted = points.slice().sort((p1, p2) => p1.timestamp - p2.timestamp);
  let dist = 0;
  let maxSpeed = 0;
  let stops = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    dist += haversineKm(prev, cur);
    const sp = Number(cur.speed || 0);
    if (Number.isFinite(sp)) maxSpeed = Math.max(maxSpeed, sp);
    if (i > 1) {
      const prevSp = Number(sorted[i - 1].speed || 0);
      if (sp < 1 && prevSp >= 3) stops += 1;
    }
  }
  const durationMin = Math.max(0, Math.round((sorted[sorted.length - 1].timestamp - sorted[0].timestamp) / 60000));
  const avgSpeed = durationMin > 0 ? Math.round(dist / (durationMin / 60)) : 0;
  return { distanceKm: Math.round(dist * 10) / 10, durationMin, avgSpeed, maxSpeed: Math.round(maxSpeed), stops };
};

const detectStops = (points: HistoryPoint[], radiusM = 50, minMinutes = 2) => {
  const result: { lat: number; lng: number; from: number; to: number; durationMin: number }[] = [];
  if (points.length < 2) return result;
  let cluster: { lat: number; lng: number; from: number; to: number; count: number } | null = null;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!cluster) {
      cluster = { lat: p.lat, lng: p.lng, from: p.timestamp, to: p.timestamp, count: 1 };
      continue;
    }
    const d = haversineKm(cluster, p) * 1000;
    if (d <= radiusM) {
      cluster.lat = (cluster.lat * cluster.count + p.lat) / (cluster.count + 1);
      cluster.lng = (cluster.lng * cluster.count + p.lng) / (cluster.count + 1);
      cluster.to = p.timestamp;
      cluster.count += 1;
    } else {
      if (cluster.count > 1) {
        const durationMin = (cluster.to - cluster.from) / 60000;
        if (durationMin >= minMinutes) {
          result.push({ lat: cluster.lat, lng: cluster.lng, from: cluster.from, to: cluster.to, durationMin: Math.round(durationMin) });
        }
      }
      cluster = { lat: p.lat, lng: p.lng, from: p.timestamp, to: p.timestamp, count: 1 };
    }
  }
  if (cluster && cluster.count > 1) {
    const durationMin = (cluster.to - cluster.from) / 60000;
    if (durationMin >= minMinutes) {
      result.push({ lat: cluster.lat, lng: cluster.lng, from: cluster.from, to: cluster.to, durationMin: Math.round(durationMin) });
    }
  }
  return result;
};

const buildDotIcon = (color: string, size = 12, label?: string) => {
  const baseStyle = `width:${size}px;height:${size}px;border-radius:9999px;background:${color};box-shadow:0 10px 25px rgba(0,0,0,0.2),0 2px 6px rgba(0,0,0,0.25)`;
  const labelStyle = label
    ? `<div style="margin-top:6px;padding:2px 6px;border-radius:6px;background:rgba(17,24,39,0.85);color:#fff;font:600 10px/1.2 system-ui;white-space:nowrap">${label}</div>`
    : "";
  const html = `<div style="display:flex;flex-direction:column;align-items:center"><div style="${baseStyle}"></div>${labelStyle}</div>`;
  return L.divIcon({ className: "traceur-dot", html, iconSize: [size, size + (label ? 18 : 0)], iconAnchor: [size / 2, size / 2] });
};

const buildStopIcon = () =>
  L.divIcon({
    className: "traceur-stop",
    html: `<div style="display:flex;flex-direction:column;align-items:center"><div style="width:18px;height:18px;border:3px solid #f59e0b;border-radius:9999px;background:#fff;box-shadow:0 6px 12px rgba(0,0,0,0.25)"></div><div style="margin-top:4px;padding:2px 6px;border-radius:6px;background:#f59e0b;color:#111827;font:600 10px/1.2 system-ui;white-space:nowrap">Arrêt</div></div>`,
    iconSize: [18, 36],
    iconAnchor: [9, 9]
  });

const buildGeofenceIcon = () =>
  L.divIcon({
    className: "geofence-icon",
    html: `<div style="width:18px;height:18px;border:3px solid #ef4444;border-radius:9999px;background:#fff;box-shadow:0 6px 12px rgba(0,0,0,0.25)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

const downloadBlob = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const toGpx = (deviceLabel: string, points: HistoryPoint[]) => {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const trkpts = points
    .map(
      (p) =>
        `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><time>${new Date(p.timestamp).toISOString()}</time><speed>${(Number(p.speed || 0) / 3.6).toFixed(2)}</speed></trkpt>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="iloca" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(deviceLabel)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${esc(deviceLabel)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
};

const toCsv = (deviceLabel: string, points: HistoryPoint[]) => {
  const header = "timestamp,lat,lng,speed_kmh,iso_time";
  const rows = points.map((p) => `${p.timestamp},${p.lat.toFixed(6)},${p.lng.toFixed(6)},${Math.round(Number(p.speed || 0))},${new Date(p.timestamp).toISOString()}`);
  return [header, ...rows].join("\n");
};

const buildReport = (deviceLabel: string, points: HistoryPoint[]) => {
  const stats = computeRouteStats(points);
  const stops = detectStops(points);
  const start = points[0] ? new Date(points[0].timestamp).toLocaleString() : "—";
  const end = points.length ? new Date(points[points.length - 1].timestamp).toLocaleString() : "—";
  const lines: string[] = [];
  lines.push(`Rapport Trajet — ${deviceLabel}`);
  lines.push("=".repeat(40));
  lines.push(`Période: ${start} → ${end}`);
  lines.push(`Points: ${points.length}`);
  lines.push(`Distance: ${stats.distanceKm} km`);
  lines.push(`Durée: ${stats.durationMin} min`);
  lines.push(`Vitesse moyenne: ${stats.avgSpeed} km/h`);
  lines.push(`Vitesse max: ${stats.maxSpeed} km/h`);
  lines.push(`Arrêts détectés: ${stops.length}`);
  lines.push("");
  if (stops.length) {
    lines.push("Arrêts:");
    stops.forEach((s, idx) => {
      lines.push(`  #${idx + 1} ${s.durationMin} min — ${new Date(s.from).toLocaleTimeString()} → ${new Date(s.to).toLocaleTimeString()} @ ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`);
    });
  }
  return lines.join("\n");
};

export default function Tracking() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const traceLineRef = useRef<L.Polyline | null>(null);
  const traceMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const geofenceMarkerRef = useRef<L.Marker | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const liveTimerRef = useRef<number | null>(null);
  const playbackIndexRef = useRef(0);
  const geofenceInsideRef = useRef<boolean | null>(null);

  const [vehicleId, setVehicleId] = useState("");
  const [gpsDevices, setGpsDevices] = useState<GPSwoxDevice[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date(Date.now() - 24 * 3600 * 1000));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [mapTheme, setMapTheme] = useState<MapTheme>("light");
  const [follow, setFollow] = useState(true);
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(160);
  const [liveMode, setLiveMode] = useState(false);
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [geofenceRadiusM, setGeofenceRadiusM] = useState(300);
  const [drawGeofence, setDrawGeofence] = useState(false);

  const { data: vehiclesFromGps = [] } = useGPSwoxVehiclesOnly(60000);

  useEffect(() => {
    if (vehiclesFromGps.length) setGpsDevices(vehiclesFromGps);
  }, [vehiclesFromGps]);

  const selectedDevice = useMemo(() => {
    if (!vehicleId) return null;
    return gpsDevices.find((d) => String(d.id) === String(vehicleId)) || null;
  }, [vehicleId, gpsDevices]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return gpsDevices;
    return gpsDevices.filter((d) => {
      return (
        d.name.toLowerCase().includes(q) ||
        d.plate.toLowerCase().includes(q) ||
        d.imei.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
      );
    });
  }, [gpsDevices, search]);

  const deviceLabel = useMemo(() => {
    if (!selectedDevice) return "vehicule";
    return selectedDevice.plate || selectedDevice.name || selectedDevice.imei || selectedDevice.id;
  }, [selectedDevice]);

  const stats = useMemo(() => computeRouteStats(points), [points]);
  const detectedStops = useMemo(() => detectStops(points), [points]);

  const syncGps = async () => {
    try {
      setSyncing(true);
      const items = await gpswoxService.getDevices();
      const seen = new Set<string>();
      const mapped: GPSwoxDevice[] = [];
      items.forEach((item) => {
        const key = `${item.imei || ""}|${item.plate || ""}|${item.id}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        mapped.push({
          id: item.id,
          name: item.name,
          plate: item.plate,
          imei: item.imei,
          brand: "",
          model: "",
          status: item.online ? (item.speed > 1 ? "moving" : "online") : "offline",
          online: item.online,
          ignition: item.ignition,
          lat: item.lat,
          lng: item.lng,
          speed: item.speed,
          fuelLevel: item.fuelLevel,
          battery: 100,
          mileage: 0,
          distanceToday: 0,
          lastUpdate: item.lastUpdate,
          lastPosition: {
            lat: item.lat,
            lng: item.lng,
            speed: item.speed,
            timestamp: Date.now(),
            city: ""
          },
          raw: item.raw
        });
      });
      if (mapped.length) {
        setGpsDevices(mapped);
        toast.success(`${mapped.length} véhicules GPSwox chargés`);
      } else {
        toast.error("Aucun véhicule GPSwox trouvé");
      }
    } catch {
      toast.error("Échec de synchronisation GPSwox");
    } finally {
      setSyncing(false);
    }
  };

  const ensureMap = () => {
    if (!mapContainerRef.current || mapRef.current) return;
    const center: L.LatLngExpression = [33.5731, -7.5898];
    const map = L.map(mapContainerRef.current, { center, zoom: 11, zoomControl: false });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const theme = tileCatalog[mapTheme];
    const tile = L.tileLayer(theme.url, { attribution: theme.attribution, maxZoom: theme.maxZoom }).addTo(map);
    const overlay = L.layerGroup().addTo(map);
    mapRef.current = map;
    tileRef.current = tile;
    overlayLayerRef.current = overlay;
    map.on("click", (e) => {
      if (!drawGeofence) return;
      setGeofenceCircle({ lat: e.latlng.lat, lng: e.latlng.lng });
      toast.success("Zone définie sur la carte");
      setDrawGeofence(false);
    });
  };

  const setTileTheme = (theme: MapTheme) => {
    setMapTheme(theme);
    const map = mapRef.current;
    if (!map) return;
    const old = tileRef.current;
    if (old) old.remove();
    const next = tileCatalog[theme];
    const tile = L.tileLayer(next.url, { attribution: next.attribution, maxZoom: next.maxZoom });
    tile.addTo(map);
    tileRef.current = tile;
  };

  const clearOverlays = () => {
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    if (traceLineRef.current) {
      traceLineRef.current.remove();
      traceLineRef.current = null;
    }
    if (traceMarkerRef.current) {
      traceMarkerRef.current.remove();
      traceMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];
  };

  const stopPlayback = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlaying(false);
  };

  const stopLive = () => {
    if (liveTimerRef.current) {
      clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    setLiveMode(false);
  };

  const fitToRoute = () => {
    const map = mapRef.current;
    if (!map || points.length < 2) return;
    const coords = points.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(L.latLngBounds(coords), { padding: [24, 24], maxZoom: 16 });
  };

  const centerOnLast = () => {
    const map = mapRef.current;
    const last = points.length ? points[points.length - 1] : null;
    if (!map || !last) return;
    map.flyTo([last.lat, last.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  };

  const drawRoute = (input: HistoryPoint[]) => {
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;

    clearOverlays();
    if (input.length < 2) return;
    const coords = input.map((p) => [p.lat, p.lng] as [number, number]);
    routeLineRef.current = L.polyline(coords, { color: "#0ea5e9", weight: 4, opacity: 0.85, lineCap: "round" }).addTo(overlay);
    startMarkerRef.current = L.marker(coords[0], { icon: buildDotIcon("#0ea5e9", 12, "Départ"), zIndexOffset: 800 }).addTo(overlay);
    endMarkerRef.current = L.marker(coords[coords.length - 1], { icon: buildDotIcon("#111827", 14, "Arrivée"), zIndexOffset: 900 }).addTo(overlay);

    const stops = detectStops(input);
    stops.forEach((s) => {
      const m = L.marker([s.lat, s.lng], { icon: buildStopIcon(), zIndexOffset: 700 }).addTo(overlay);
      m.bindPopup(
        `<div style="min-width:180px"><div style="font-weight:600">Arrêt</div><div>Durée: ${s.durationMin} min</div><div>${new Date(s.from).toLocaleTimeString()} → ${new Date(s.to).toLocaleTimeString()}</div></div>`
      );
      stopMarkersRef.current.push(m);
    });

    fitToRoute();
  };

  const setGeofenceCircle = (center: { lat: number; lng: number }) => {
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;
    if (geofenceCircleRef.current) geofenceCircleRef.current.remove();
    if (geofenceMarkerRef.current) geofenceMarkerRef.current.remove();
    geofenceCircleRef.current = L.circle([center.lat, center.lng], {
      radius: geofenceRadiusM,
      color: "#ef4444",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.08
    }).addTo(overlay);
    geofenceMarkerRef.current = L.marker([center.lat, center.lng], { icon: buildGeofenceIcon(), zIndexOffset: 950 }).addTo(overlay);
    geofenceInsideRef.current = null;
  };

  const loadHistory = async () => {
    ensureMap();
    stopPlayback();
    stopLive();

    if (!selectedDevice) {
      toast.error("Choisissez un véhicule GPSwox");
      return;
    }

    try {
      const { fromIso, toIso } = toIsoRange(fromDate, toDate);
      const history = await gpswoxService.getDeviceHistory(selectedDevice.id, fromIso, toIso);
      const normalized: HistoryPoint[] = (history || [])
        .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p: any) => ({
          lat: Number(p.lat),
          lng: Number(p.lng),
          timestamp: Number(p.timestamp) || Date.now(),
          speed: Number.isFinite(Number(p.speed)) ? Number(p.speed) : 0
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      setPoints(normalized);
      geofenceInsideRef.current = null;

      if (!normalized.length) {
        toast.error("Aucun historique pour cette période");
        clearOverlays();
        return;
      }
      drawRoute(normalized);
      toast.success("Trajet chargé");
    } catch {
      toast.error("Échec de chargement du trajet");
    }
  };

  const togglePlayback = () => {
    ensureMap();
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;
    if (points.length < 2) {
      toast.error("Aucun trajet chargé");
      return;
    }

    if (isPlaying) {
      stopPlayback();
      return;
    }

    stopLive();
    setIsPlaying(true);

    if (playbackIndexRef.current >= points.length - 1) playbackIndexRef.current = 0;
    const start = points[playbackIndexRef.current];

    if (!traceMarkerRef.current) {
      traceMarkerRef.current = L.marker([start.lat, start.lng], { icon: buildDotIcon("#111827", 12), zIndexOffset: 1000 }).addTo(overlay);
    } else {
      traceMarkerRef.current.setLatLng([start.lat, start.lng]);
      traceMarkerRef.current.addTo(overlay);
    }

    if (!traceLineRef.current) {
      traceLineRef.current = L.polyline([[start.lat, start.lng]], { color: "#111827", weight: 5, opacity: 0.8, lineCap: "round" }).addTo(overlay);
    } else {
      traceLineRef.current.setLatLngs([[start.lat, start.lng]]);
      traceLineRef.current.addTo(overlay);
    }

    map.panTo([start.lat, start.lng], { animate: true, duration: 0.3 });

    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    playbackTimerRef.current = window.setInterval(() => {
      if (playbackIndexRef.current >= points.length - 1) {
        stopPlayback();
        toast.success("Fin de la lecture");
        return;
      }
      playbackIndexRef.current += 1;
      const p = points[playbackIndexRef.current];
      const latlng: [number, number] = [p.lat, p.lng];
      if (traceMarkerRef.current) traceMarkerRef.current.setLatLng(latlng);
      if (traceLineRef.current) {
        const nextCoords = points.slice(0, playbackIndexRef.current + 1).map((x) => [x.lat, x.lng] as [number, number]);
        traceLineRef.current.setLatLngs(nextCoords);
      }
      if (follow) map.panTo(latlng, { animate: true, duration: 0.25 });

      if (geofenceEnabled && geofenceCircleRef.current) {
        const center = geofenceCircleRef.current.getLatLng();
        const inside = center.distanceTo(L.latLng(latlng)) <= geofenceRadiusM;
        if (geofenceInsideRef.current === null) {
          geofenceInsideRef.current = inside;
        } else if (geofenceInsideRef.current !== inside) {
          geofenceInsideRef.current = inside;
          toast(inside ? "Entrée dans la zone" : "Sortie de la zone", {
            description: deviceLabel
          });
        }
      }
    }, clamp(playSpeedMs, 80, 600));
  };

  const replay = () => {
    playbackIndexRef.current = 0;
    stopPlayback();
    clearOverlays();
    drawRoute(points);
    togglePlayback();
  };

  const setGeofenceAtCenter = () => {
    ensureMap();
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setGeofenceCircle({ lat: c.lat, lng: c.lng });
    toast.success("Zone définie au centre de la carte");
  };

  const applyGeofenceVisibility = (enabled: boolean) => {
    if (!enabled) {
      if (geofenceCircleRef.current) {
        geofenceCircleRef.current.remove();
        geofenceCircleRef.current = null;
      }
      if (geofenceMarkerRef.current) {
        geofenceMarkerRef.current.remove();
        geofenceMarkerRef.current = null;
      }
      geofenceInsideRef.current = null;
    }
  };

  const startLive = async () => {
    ensureMap();
    stopPlayback();

    if (!selectedDevice) {
      toast.error("Choisissez un véhicule GPSwox");
      return;
    }

    setLiveMode(true);
    if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    liveTimerRef.current = window.setInterval(async () => {
      try {
        const devices = await gpswoxService.getDevices();
        setGpsDevices(devices.map((item, _idx, arr) => arr.find((x) => x.id === item.id) || item) as any);
        const device = devices.find((d) => d.id === selectedDevice.id) || devices.find((d) => d.plate === selectedDevice.plate) || null;
        if (!device || !device.lat || !device.lng) return;
        const next: HistoryPoint = { lat: device.lat, lng: device.lng, timestamp: Date.now(), speed: device.speed };
        setPoints((prev) => {
          const last = prev.length ? prev[prev.length - 1] : null;
          if (last && Math.abs(last.lat - next.lat) < 0.000001 && Math.abs(last.lng - next.lng) < 0.000001) return prev;
          const updated = [...prev, next];
          drawRoute(updated);
          if (follow && mapRef.current) {
            mapRef.current.panTo([next.lat, next.lng], { animate: true, duration: 0.25 });
          }
          return updated;
        });
      } catch {
      }
    }, 8000);
    toast.success("Mode direct activé");
  };

  useEffect(() => {
    ensureMap();
    return () => {
      stopPlayback();
      stopLive();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      tileRef.current = null;
      overlayLayerRef.current = null;
      routeLineRef.current = null;
      traceLineRef.current = null;
      traceMarkerRef.current = null;
      endMarkerRef.current = null;
      startMarkerRef.current = null;
      geofenceCircleRef.current = null;
      geofenceMarkerRef.current = null;
      stopMarkersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    setTileTheme(mapTheme);
  }, [mapTheme]);

  useEffect(() => {
    applyGeofenceVisibility(geofenceEnabled);
    if (geofenceCircleRef.current) geofenceCircleRef.current.setRadius(geofenceRadiusM);
  }, [geofenceEnabled, geofenceRadiusM]);

  useEffect(() => {
    stopPlayback();
    stopLive();
    setPoints([]);
    clearOverlays();
    playbackIndexRef.current = 0;
    geofenceInsideRef.current = null;
  }, [vehicleId]);

  useEffect(() => {
    if (!follow) return;
    if (!points.length) return;
    if (!mapRef.current) return;
    if (isPlaying) return;
    const last = points[points.length - 1];
    mapRef.current.panTo([last.lat, last.lng], { animate: true, duration: 0.25 });
  }, [follow, isPlaying, points]);

  const lastPoint = points.length ? points[points.length - 1] : null;
  const canPlay = points.length >= 2;

  const handleExport = (format: "gpx" | "csv" | "txt") => {
    if (!points.length) {
      toast.error("Aucun trajet à exporter");
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (format === "gpx") {
      downloadBlob(`trajet-${deviceLabel}-${stamp}.gpx`, toGpx(deviceLabel, points), "application/gpx+xml");
    } else if (format === "csv") {
      downloadBlob(`trajet-${deviceLabel}-${stamp}.csv`, toCsv(deviceLabel, points), "text/csv");
    } else {
      downloadBlob(`rapport-${deviceLabel}-${stamp}.txt`, buildReport(deviceLabel, points), "text/plain");
    }
    toast.success("Export prêt");
  };

  return (
    <div className="space-y-4 safe-pt safe-pb">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">Suivi GPSwox — Trajet vidéo</CardTitle>
              <div className="text-xs text-muted-foreground">
                Sélectionnez un véhicule GPSwox, choisissez une période, puis lancez la lecture animée du trajet.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={syncGps} disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sync..." : "Sync GPSwox"}
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
              <Button variant="outline" onClick={fitToRoute} disabled={points.length < 2}>
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
                <Route className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">Distance</span>
                <span className="font-semibold">{stats.distanceKm} km</span>
              </div>
              <div className="rounded-full bg-black/70 text-white text-[11px] px-2.5 py-1 inline-flex items-center gap-2">
                <TimerReset className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">Durée</span>
                <span className="font-semibold">{stats.durationMin} min</span>
              </div>
              <div className="rounded-full bg-black/70 text-white text-[11px] px-2.5 py-1 inline-flex items-center gap-2">
                <Compass className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">Arrêts</span>
                <span className="font-semibold">{stats.stops}</span>
              </div>
              {lastPoint ? (
                <div className="rounded-full bg-black/70 text-white text-[11px] px-2.5 py-1 inline-flex items-center gap-2">
                  <Compass className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">Dernière</span>
                  <span className="font-semibold">{formatAgo(lastPoint.timestamp)}</span>
                </div>
              ) : null}
            </div>

            <div className="absolute right-3 top-3 z-[600] flex items-center gap-2 rounded-2xl border bg-background/80 backdrop-blur px-3 py-2 shadow-sm">
              <div className="text-xs text-muted-foreground">Follow</div>
              <Switch checked={follow} onCheckedChange={(v) => setFollow(v)} />
              <Button size="icon" variant="ghost" onClick={centerOnLast} disabled={!lastPoint}>
                <LocateFixed className="h-4 w-4" />
              </Button>
            </div>

            <div ref={mapContainerRef} className="h-full w-full" />
          </div>

          <div className="rounded-3xl border bg-card overflow-hidden flex flex-col h-[52vh] lg:h-[calc(100dvh-16rem)]">
            <div className="p-4 border-b space-y-3 overflow-y-auto">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold">Contrôles</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {selectedDevice ? `${selectedDevice.plate || selectedDevice.name}` : "Aucun véhicule GPSwox sélectionné"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={loadHistory} disabled={!selectedDevice}>
                    Charger
                  </Button>
                  <Button size="sm" onClick={togglePlayback} disabled={!canPlay} variant={isPlaying ? "destructive" : "default"}>
                    {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isPlaying ? "Pause" : "Lecture"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium">Véhicule (GPSwox uniquement)</div>
                <div className="grid gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom, plaque, IMEI..." className="pl-8" />
                  </div>
                  <Select value={vehicleId} onValueChange={(v) => setVehicleId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un véhicule GPSwox" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDevices.length ? (
                        filteredDevices.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {(d.name || d.plate || d.imei) + (d.plate ? ` — ${d.plate}` : "")}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__empty" disabled>
                          Aucun véhicule — cliquez sur Sync
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-muted-foreground truncate">
                      {gpsDevices.length} véhicule(s) GPSwox
                    </div>
                    {selectedDevice ? <Badge variant="secondary">OK</Badge> : <Badge variant="secondary">—</Badge>}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <div className="text-xs font-medium">من</div>
                  <DatePicker value={fromDate} onChange={setFromDate} placeholder="Date début" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium">إلى</div>
                  <DatePicker value={toDate} onChange={setToDate} placeholder="Date fin" />
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/40 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Trajet vidéo (Traceur)</div>
                  <Button size="sm" variant="outline" onClick={replay} disabled={!canPlay}>
                    Rejouer
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Vitesse</div>
                  <Slider value={[playSpeedMs]} min={80} max={600} step={20} onValueChange={(v) => setPlaySpeedMs(v[0] || 160)} />
                  <div className="text-xs text-muted-foreground">{playSpeedMs} ms / étape</div>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/40 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Mode direct</div>
                  <Switch
                    checked={liveMode}
                    onCheckedChange={(v) => {
                      if (v) void startLive();
                      else stopLive();
                    }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Ajoute automatiquement la dernière position GPSwox (toutes les ~8s) au trajet.
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/40 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold inline-flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Geofencing
                  </div>
                  <Switch checked={geofenceEnabled} onCheckedChange={(v) => setGeofenceEnabled(v)} />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Rayon: {geofenceRadiusM} m</div>
                  <Slider value={[geofenceRadiusM]} min={100} max={3000} step={50} onValueChange={(v) => setGeofenceRadiusM(v[0] || 300)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={setGeofenceAtCenter} disabled={!geofenceEnabled}>
                      Centre carte
                    </Button>
                    <Button size="sm" variant={drawGeofence ? "default" : "outline"} onClick={() => setDrawGeofence((v) => !v)} disabled={!geofenceEnabled}>
                      {drawGeofence ? "Cliquez sur la carte..." : "Cliquer sur la carte"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/40 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Exporter</div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleExport("gpx")} disabled={!points.length}>
                      <Download className="mr-1 h-3.5 w-3.5" /> GPX
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport("csv")} disabled={!points.length}>
                      <Download className="mr-1 h-3.5 w-3.5" /> CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport("txt")} disabled={!points.length}>
                      <FileText className="mr-1 h-3.5 w-3.5" /> Rapport
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Inclut arrêts détectés et statistiques de trajet.
                </div>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full" disabled={!selectedDevice}>
                    Détails
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-lg">
                  <SheetHeader>
                    <SheetTitle>Détails Tracking</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{selectedDevice?.name || deviceLabel}</div>
                          <div className="text-sm text-muted-foreground truncate">{selectedDevice?.plate || "—"}</div>
                        </div>
                        <Badge variant="secondary">{points.length} pts</Badge>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Distance</div>
                          <div className="font-medium">{stats.distanceKm} km</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Durée</div>
                          <div className="font-medium">{stats.durationMin} min</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Vitesse moy.</div>
                          <div className="font-medium">{stats.avgSpeed} km/h</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Vitesse max</div>
                          <div className="font-medium">{stats.maxSpeed} km/h</div>
                        </div>
                      </div>
                      {typeof selectedDevice?.fuelLevel === "number" ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Carburant</span>
                            <span>{Math.round(selectedDevice.fuelLevel)}%</span>
                          </div>
                          <Progress value={clamp(selectedDevice.fuelLevel, 0, 100)} />
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="font-semibold text-sm mb-2">Arrêts détectés</div>
                      {detectedStops.length ? (
                        <ScrollArea className="h-32 pr-3">
                          <div className="space-y-2">
                            {detectedStops.map((s, idx) => (
                              <div key={`${idx}-${s.from}`} className="rounded-xl border bg-background/60 px-3 py-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">#{idx + 1} — {s.durationMin} min</span>
                                  <span className="text-muted-foreground">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</span>
                                </div>
                                <div className="text-muted-foreground mt-0.5">{new Date(s.from).toLocaleTimeString()} → {new Date(s.to).toLocaleTimeString()}</div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-sm text-muted-foreground">Aucun arrêt détecté.</div>
                      )}
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="font-semibold text-sm mb-2">Points (dernier → premier)</div>
                      {points.length ? (
                        <ScrollArea className="h-72 pr-3">
                          <div className="space-y-2">
                            {points
                              .slice()
                              .reverse()
                              .map((p) => (
                                <div key={`${p.timestamp}-${p.lat}-${p.lng}`} className="rounded-xl border bg-background/60 px-3 py-2">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{new Date(p.timestamp).toLocaleTimeString()}</span>
                                    <span>{Math.round(p.speed || 0)} km/h</span>
                                  </div>
                                  <div className="text-xs mt-1">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</div>
                                </div>
                              ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-sm text-muted-foreground">Aucun trajet chargé.</div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
