import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "@/components/ui/sonner";
import { useGPSwoxVehicles, GPSwoxVehicle } from "@/hooks/useGPSwoxVehicles";
import { gpswoxService } from "@/services/gpswoxService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Battery,
  Clock3,
  Focus,
  Gauge,
  Layers,
  LocateFixed,
  MapPin,
  Pause,
  PanelRightClose,
  PanelRightOpen,
  Play,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  Fuel,
  Route,
  Car,
  Download,
  FileText,
  Navigation,
  Compass,
  Zap,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Table as TableIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Minus
} from "lucide-react";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyANl_xzJcEYaItw6TNeqTJ-CRHeuYjLjp8";

type MapTheme =
  | "google_hybrid"
  | "google_roadmap"
  | "google_traffic"
  | "google_satellite"
  | "google_terrain"
  | "dark"
  | "satellite"
  | "light"
  | "osm";
type HistoryPoint = { lat: number; lng: number; timestamp: number; speed?: number };
type DatePreset = "1h" | "today" | "24h" | "7d" | "custom";

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
    return {
      label: "En mouvement",
      color: "#10b981", // Emerald neon for moving (GPSwox Green)
      glow: "rgba(16, 185, 129, 0.4)",
      badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
    };
  }
  if (s === "online") {
    return {
      label: "Arrêt / Stationné",
      color: "#f59e0b", // Amber/Gold neon for stationary (GPSwox Yellow Ack)
      glow: "rgba(245, 158, 11, 0.4)",
      badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
    };
  }
  return {
    label: "Hors ligne",
    color: "#f43f5e", // Rose/Crimson for offline (GPSwox Red)
    glow: "rgba(244, 63, 94, 0.3)",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
  };
};

const tileCatalog: Record<
  MapTheme,
  {
    label: string;
    description: string;
    url: string;
    attribution: string;
    maxZoom: number;
    subdomains?: string[];
    isGoogle?: boolean;
    badge?: string;
  }
> = {
  google_hybrid: {
    label: "Google Maps Hybride",
    description: "Satellite Google + Noms des rues & POIs",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=fr&gl=MA",
    attribution: "&copy; Google Maps",
    maxZoom: 21,
    subdomains: ["0", "1", "2", "3"],
    isGoogle: true,
    badge: "Google"
  },
  google_roadmap: {
    label: "Google Maps Routier",
    description: "Plan officiel Google standard avec gl=MA",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=fr&gl=MA",
    attribution: "&copy; Google Maps",
    maxZoom: 21,
    subdomains: ["0", "1", "2", "3"],
    isGoogle: true,
    badge: "Google"
  },
  google_traffic: {
    label: "Google Maps Trafic Live",
    description: "Trafic routier et embouteillages en direct",
    url: "https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}&hl=fr&gl=MA",
    attribution: "&copy; Google Maps Traffic",
    maxZoom: 21,
    subdomains: ["0", "1", "2", "3"],
    isGoogle: true,
    badge: "Trafic"
  },
  google_satellite: {
    label: "Google Maps Satellite",
    description: "Photographie satellite pure Google",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl=fr&gl=MA",
    attribution: "&copy; Google Maps",
    maxZoom: 21,
    subdomains: ["0", "1", "2", "3"],
    isGoogle: true,
    badge: "Google"
  },
  google_terrain: {
    label: "Google Maps Relief",
    description: "Topographie et relief physique du Maroc",
    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=fr&gl=MA",
    attribution: "&copy; Google Maps",
    maxZoom: 21,
    subdomains: ["0", "1", "2", "3"],
    isGoogle: true,
    badge: "Google"
  },
  dark: {
    label: "Cyber Dark 2026",
    description: "Contraste élevé nuit & télémétrie",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20
  },
  satellite: {
    label: "Satellite Aéro ESRI",
    description: "Imagerie haute résolution ESRI",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19
  },
  light: {
    label: "Clair Épuré",
    description: "Design minimaliste haute clarté",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20
  },
  osm: {
    label: "Standard OSM",
    description: "Cartographie routière détaillée",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }
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

// 2026 Aerospace Marker Generator
function buildModernVehicleMarker(item: {
  status: "online" | "moving" | "offline";
  statusColor: string;
  speed: number;
  label: string;
  plate: string;
  selected: boolean;
}) {
  const size = item.selected ? 38 : 30;
  const isMoving = item.status === "moving";
  const pulseClass = item.selected || isMoving ? "gps-radar-pulse" : "";
  const speedText = isMoving ? `${Math.round(item.speed)}` : "";

  const html = `
    <div style="position:relative; width:${size}px; height:${size}px; transform:translate(-50%, -50%); cursor:pointer;">
      ${
        item.selected
          ? `<div style="position:absolute; inset:-12px; border-radius:9999px; background:${item.statusColor}; opacity:0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
          : ""
      }
      <div style="
        position:absolute;
        inset:0;
        border-radius:9999px;
        background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4), transparent 70%), ${item.statusColor};
        border: ${item.selected ? "3px solid #ffffff" : "2px solid rgba(255,255,255,0.9)"};
        box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 0 16px ${item.statusColor}80;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      ">
        <svg width="${item.selected ? 18 : 14}" height="${item.selected ? 18 : 14}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
      ${
        speedText
          ? `<div style="
              position:absolute;
              bottom:-6px;
              left:50%;
              transform:translateX(-50%);
              background:rgba(15,23,42,0.92);
              border:1px solid ${item.statusColor};
              color:#ffffff;
              font-size:9px;
              font-weight:900;
              padding:1px 5px;
              border-radius:9999px;
              white-space:nowrap;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
            ">${speedText}k</div>`
          : ""
      }
    </div>
  `;

  return L.divIcon({
    className: `custom-telemetry-marker ${pulseClass}`,
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function buildFlagMarker(type: "start" | "end") {
  const isStart = type === "start";
  const bg = isStart ? "#10b981" : "#8b5cf6";
  const label = isStart ? "A" : "B";
  const html = `
    <div style="position:relative; transform:translate(-50%, -100%); display:flex; flex-direction:column; align-items:center;">
      <div style="
        width:24px;
        height:24px;
        border-radius:9999px;
        background:${bg};
        color:#ffffff;
        font-weight:900;
        font-size:11px;
        display:flex;
        align-items:center;
        justify-content:center;
        border:2px solid #ffffff;
        box-shadow:0 6px 16px rgba(0,0,0,0.35);
      ">${label}</div>
      <div style="width:2px; height:6px; background:${bg};"></div>
    </div>
  `;
  return L.divIcon({
    className: "flag-marker",
    html,
    iconSize: [24, 30],
    iconAnchor: [12, 30]
  });
}

function buildStopMarker(durationMin: number) {
  const html = `
    <div style="position:relative; transform:translate(-50%, -50%); cursor:pointer;">
      <div style="
        background:#ef4444;
        color:#ffffff;
        font-size:10px;
        font-weight:800;
        padding:2px 6px;
        border-radius:9999px;
        border:1.5px solid #ffffff;
        display:flex;
        align-items:center;
        gap:3px;
        box-shadow:0 4px 12px rgba(239,68,68,0.4);
        white-space:nowrap;
      ">
        <span style="font-weight:900;">P</span>
        <span>${durationMin}m</span>
      </div>
    </div>
  `;
  return L.divIcon({
    className: "stop-marker",
    html,
    iconSize: [40, 20],
    iconAnchor: [20, 10]
  });
}

export default function FleetMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const traceLineRef = useRef<L.Polyline | null>(null);
  const traceMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const playbackTimerRef = useRef<number | null>(null);
  const autoFitDoneRef = useRef(false);

  // Core UI states
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "moving" | "offline">("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [mapTheme, setMapTheme] = useState<MapTheme>("google_hybrid");
  const [deckOpen, setDeckOpen] = useState(false);
  const [activeDeckTab, setActiveDeckTab] = useState<"flotte" | "tableau" | "trajet" | "capteurs">("flotte");
  const [followSelected, setFollowSelected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Tracking & Replay states
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(new Date(Date.now() - 24 * 3600 * 1000));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());
  const [routePoints, setRoutePoints] = useState<HistoryPoint[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playSpeedMultiplier, setPlaySpeedMultiplier] = useState<number>(1);

  // GPS Data hook
  const { data: vehicles = [], error, refetch, isFetching } = useGPSwoxVehicles(30000);

  // Normalized fleet items
  const items = useMemo(() => {
    return vehicles.map((v) => {
      const label = v.name || `${v.brand || ""} ${v.model || ""}`.trim() || v.raw?.name || "Véhicule";
      const plateText = v.plate || v.imei || "-";
      const hasPosition = Number.isFinite(v.lastPosition?.lat) && Number.isFinite(v.lastPosition?.lng);
      const last = v.lastPosition;
      const meta = statusMeta(v.status);
      const isOnline = v.status === "online" || v.status === "moving";
      return {
        id: String(v.id),
        label,
        plateText,
        status: v.status,
        statusLabel: meta.label,
        statusColor: meta.color,
        statusGlow: meta.glow,
        statusBadge: meta.badge,
        isOnline,
        speed: last?.speed || 0,
        last,
        hasPosition,
        fuel: v.fuelQuantity,
        battery: v.battery,
        mileage: v.mileage || 0,
        distanceToday: v.distanceToday || 0,
        city: v.lastPosition?.city || "",
        driver: v.driver || "Non assigné",
        brand: v.brand,
        model: v.model,
        imei: v.imei
      };
    });
  }, [vehicles]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const online = items.filter((i) => i.status === "online").length;
    const moving = items.filter((i) => i.status === "moving").length;
    const offline = items.filter((i) => i.status === "offline").length;
    const activeTotal = online + moving;
    const avgSpeed = total ? Math.round(items.reduce((sum, i) => sum + (i.speed || 0), 0) / total) : 0;
    const totalDistanceToday = Math.round(items.reduce((sum, i) => sum + (i.distanceToday || 0), 0));
    return { total, online, moving, offline, activeTotal, avgSpeed, totalDistanceToday };
  }, [items]);

  // Filtered items
  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const byFilter =
        filter === "all"
          ? true
          : filter === "online"
          ? item.status === "online"
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

  // Route statistics
  const routeStats = useMemo(() => computeRouteStats(routePoints), [routePoints]);
  const detectedStops = useMemo(() => detectStops(routePoints), [routePoints]);

  // Sync GPS Trigger
  const refreshGps = async () => {
    await refetch();
    if (!error) {
      toast.success("Synchronisation SFT GPS 2026 réussie", {
        description: `${vehicles.length} balises actualisées en temps réel.`
      });
    } else {
      toast.error("Échec de synchronisation SFT GPS");
    }
  };

  // Center/Fit Map bounds
  const fitToVisible = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const valid = visibleItems.filter((i) => i.hasPosition && i.last);
    if (!valid.length) return;
    const bounds = L.latLngBounds(valid.map((i) => [i.last!.lat, i.last!.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [visibleItems]);

  const focusSelected = useCallback((zoomLevel = 15) => {
    const map = mapRef.current;
    if (!map || !selectedItem?.hasPosition || !selectedItem.last) return;
    map.flyTo([selectedItem.last.lat, selectedItem.last.lng], Math.max(map.getZoom(), zoomLevel), {
      duration: 0.8
    });
  }, [selectedItem]);

  // Clear tracking route overlays
  const clearRouteOverlays = () => {
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
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];
  };

  // Stop active playback
  const stopPlayback = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlaying(false);
  };

  // Draw Route Polyline, Flags, Stops
  const renderRouteOnMap = (pts: HistoryPoint[]) => {
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;

    clearRouteOverlays();
    if (pts.length < 2) return;

    const coords = pts.map((p) => [p.lat, p.lng] as [number, number]);

    // High tech glowing polyline
    routeLineRef.current = L.polyline(coords, {
      color: "#0ea5e9",
      weight: 5,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(overlay);

    // Flags A and B
    startMarkerRef.current = L.marker(coords[0], {
      icon: buildFlagMarker("start"),
      zIndexOffset: 800
    }).addTo(overlay);

    endMarkerRef.current = L.marker(coords[coords.length - 1], {
      icon: buildFlagMarker("end"),
      zIndexOffset: 850
    }).addTo(overlay);

    // Stops
    const stops = detectStops(pts);
    stops.forEach((s) => {
      const sm = L.marker([s.lat, s.lng], {
        icon: buildStopMarker(s.durationMin),
        zIndexOffset: 750
      }).addTo(overlay);

      sm.bindPopup(`
        <div style="font-family:sans-serif; min-width:180px; padding:4px;">
          <div style="font-weight:900; color:#ef4444; font-size:12px; margin-bottom:2px;">ARRÊT DÉTECTÉ</div>
          <div style="font-size:13px; font-weight:700;">Durée : ${s.durationMin} minutes</div>
          <div style="font-size:11px; color:#64748b; margin-top:4px;">
            ${new Date(s.from).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → ${new Date(s.to).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      `);
      stopMarkersRef.current.push(sm);
    });

    // Fit map bounds to route
    map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 16 });
  };

  // Load Historical Route for selected vehicle
  const loadVehicleHistory = async (deviceId: string) => {
    if (!deviceId) return;
    setIsLoadingRoute(true);
    stopPlayback();
    setPlaybackIndex(0);

    try {
      let fromIso: string;
      let toIso: string = new Date().toISOString();

      if (datePreset === "1h") {
        fromIso = new Date(Date.now() - 3600 * 1000).toISOString();
      } else if (datePreset === "today") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        fromIso = startOfToday.toISOString();
      } else if (datePreset === "24h") {
        fromIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      } else if (datePreset === "7d") {
        fromIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      } else {
        fromIso = (customFrom || new Date(Date.now() - 24 * 3600 * 1000)).toISOString();
        toIso = (customTo || new Date()).toISOString();
      }

      const res = await gpswoxService.getDeviceHistory(deviceId, fromIso, toIso);
      const normalized: HistoryPoint[] = (res || [])
        .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p: any) => ({
          lat: Number(p.lat),
          lng: Number(p.lng),
          timestamp: Number(p.timestamp) || (p.time ? new Date(p.time).getTime() : Date.now()),
          speed: Number.isFinite(Number(p.speed)) ? Number(p.speed) : 0
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      setRoutePoints(normalized);

      if (normalized.length >= 2) {
        renderRouteOnMap(normalized);
        toast.success(`Trajet chargé (${normalized.length} points)`, {
          description: `Distance: ${computeRouteStats(normalized).distanceKm} km`
        });
      } else {
        clearRouteOverlays();
        toast.error("Aucun trajet enregistré sur ce créneau horaire.");
      }
    } catch (err: any) {
      toast.error("Impossible de récupérer l'historique GPS", {
        description: err?.message || "Erreur de connexion serveur"
      });
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Playback Control
  const togglePlay = () => {
    if (routePoints.length < 2) {
      toast.error("Veuillez d'abord charger un trajet");
      return;
    }

    if (isPlaying) {
      stopPlayback();
      return;
    }

    setIsPlaying(true);
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;

    let currentIndex = playbackIndex;
    if (currentIndex >= routePoints.length - 1) {
      currentIndex = 0;
      setPlaybackIndex(0);
    }

    const baseInterval = Math.max(40, 200 / playSpeedMultiplier);

    playbackTimerRef.current = window.setInterval(() => {
      currentIndex += 1;
      if (currentIndex >= routePoints.length) {
        stopPlayback();
        return;
      }

      setPlaybackIndex(currentIndex);
      const currentPoint = routePoints[currentIndex];
      const currentLatLng: [number, number] = [currentPoint.lat, currentPoint.lng];

      // Trace line update
      if (!traceLineRef.current) {
        traceLineRef.current = L.polyline(routePoints.slice(0, currentIndex + 1).map((p) => [p.lat, p.lng]), {
          color: "#ffffff",
          weight: 4,
          opacity: 0.95
        }).addTo(overlay);
      } else {
        traceLineRef.current.setLatLngs(routePoints.slice(0, currentIndex + 1).map((p) => [p.lat, p.lng]));
      }

      // Moving Marker update
      if (!traceMarkerRef.current) {
        traceMarkerRef.current = L.marker(currentLatLng, {
          icon: buildModernVehicleMarker({
            status: "moving",
            statusColor: "#0ea5e9",
            speed: currentPoint.speed || 0,
            label: "Traceur",
            plate: "",
            selected: true
          }),
          zIndexOffset: 1000
        }).addTo(overlay);
      } else {
        traceMarkerRef.current.setLatLng(currentLatLng);
      }

      if (followSelected) {
        map.panTo(currentLatLng, { animate: true, duration: 0.2 });
      }
    }, baseInterval);
  };

  // Seek on scrubber
  const handleSeek = (newIndex: number) => {
    const bounded = clamp(newIndex, 0, routePoints.length - 1);
    setPlaybackIndex(bounded);
    const point = routePoints[bounded];
    if (!point) return;

    const overlay = overlayLayerRef.current;
    if (!overlay) return;

    const currentLatLng: [number, number] = [point.lat, point.lng];

    if (!traceMarkerRef.current) {
      traceMarkerRef.current = L.marker(currentLatLng, {
        icon: buildModernVehicleMarker({
          status: "moving",
          statusColor: "#0ea5e9",
          speed: point.speed || 0,
          label: "Traceur",
          plate: "",
          selected: true
        }),
        zIndexOffset: 1000
      }).addTo(overlay);
    } else {
      traceMarkerRef.current.setLatLng(currentLatLng);
    }

    if (traceLineRef.current) {
      traceLineRef.current.setLatLngs(routePoints.slice(0, bounded + 1).map((p) => [p.lat, p.lng]));
    }

    if (followSelected && mapRef.current) {
      mapRef.current.panTo(currentLatLng, { animate: true, duration: 0.2 });
    }
  };

  // Route Export
  const exportRoute = (format: "csv" | "gpx" | "txt") => {
    if (!routePoints.length) {
      toast.error("Aucun point de trajet à exporter");
      return;
    }
    const targetLabel = selectedItem?.label || "vehicule";
    const nowStamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const header = "timestamp,iso_date,latitude,longitude,speed_kmh\n";
      const rows = routePoints
        .map((p) => `${p.timestamp},${new Date(p.timestamp).toISOString()},${p.lat.toFixed(6)},${p.lng.toFixed(6)},${Math.round(p.speed || 0)}`)
        .join("\n");
      const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trajet-${targetLabel}-${nowStamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Fichier CSV téléchargé avec succès");
    } else if (format === "gpx") {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SFT GPS 2026">
  <trk>
    <name>Trajet ${targetLabel}</name>
    <trkseg>
      ${routePoints.map((p) => `<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.timestamp).toISOString()}</time><speed>${p.speed || 0}</speed></trkpt>`).join("\n      ")}
    </trkseg>
  </trk>
</gpx>`;
      const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trajet-${targetLabel}-${nowStamp}.gpx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Fichier GPX téléchargé");
    } else {
      const textReport = `================================================
RAPPORT DE TRAJET & TÉLÉMÉTRIE SFT 2026
================================================
Véhicule: ${targetLabel} (${selectedItem?.plateText || ""})
Points enregistrés: ${routePoints.length}
Distance totale: ${routeStats.distanceKm} km
Durée estimée: ${routeStats.durationMin} minutes
Vitesse moyenne: ${routeStats.avgSpeed} km/h
Vitesse maximale: ${routeStats.maxSpeed} km/h
Nombre d'arrêts: ${detectedStops.length}

ARRÊTS DÉTECTÉS:
${detectedStops.map((s, idx) => `  ${idx + 1}. Durée: ${s.durationMin} min | Du ${new Date(s.from).toLocaleTimeString()} au ${new Date(s.to).toLocaleTimeString()} (${s.lat.toFixed(4)}, ${s.lng.toFixed(4)})`).join("\n")}
================================================`;
      const blob = new Blob([textReport], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-${targetLabel}-${nowStamp}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Rapport texte téléchargé");
    }
  };

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const center: L.LatLngExpression = [33.5731, -7.5898]; // Casablanca Default
    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 11,
      zoomControl: false
    });

    const theme = tileCatalog[mapTheme];
    const tile = L.tileLayer(theme.url, {
      attribution: theme.attribution,
      maxZoom: theme.maxZoom,
      subdomains: theme.subdomains || "abc"
    }).addTo(map);

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
      clearRouteOverlays();
    };
  }, []);

  // Map Theme Switching
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const old = tileRef.current;
    if (old) {
      try {
        map.removeLayer(old);
      } catch {
        try {
          old.remove();
        } catch {
          // ignore
        }
      }
    }
    const theme = tileCatalog[mapTheme];
    const tile = L.tileLayer(theme.url, {
      attribution: theme.attribution,
      maxZoom: theme.maxZoom,
      subdomains: theme.subdomains || "abc"
    });
    tile.addTo(map);
    tileRef.current = tile;
  }, [mapTheme]);

  // Render Vehicle Markers on Map
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    visibleItems.forEach((item) => {
      if (!item.hasPosition || !item.last) return;
      const isSelected = item.id === selectedId;

      const marker = L.marker([item.last.lat, item.last.lng], {
        icon: buildModernVehicleMarker({
          status: item.status,
          statusColor: item.statusColor,
          speed: item.speed,
          label: item.label,
          plate: item.plateText,
          selected: isSelected
        }),
        zIndexOffset: isSelected ? 1200 : 500
      });

      marker.on("click", () => {
        setSelectedId(item.id);
        setMobileDetailOpen(true);
      });

      // Glass Popup
      marker.bindPopup(`
        <div style="font-family:sans-serif; min-width:210px; padding:6px; color:#0f172a;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <span style="font-size:10px; font-weight:800; text-transform:uppercase; color:${item.statusColor};">
              ● ${item.statusLabel}
            </span>
            <span style="font-size:10px; color:#64748b; font-weight:600;">
              ${formatAgo(item.last?.timestamp)}
            </span>
          </div>
          <div style="font-weight:900; font-size:14px; color:#0f172a; margin-bottom:2px;">
            ${item.label}
          </div>
          <div style="font-size:11px; font-weight:700; color:#475569; margin-bottom:8px;">
            ${item.plateText} ${item.city ? `• ${item.city}` : ""}
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; background:#f1f5f9; padding:6px; border-radius:8px; font-size:11px; margin-bottom:8px;">
            <div>
              <span style="color:#64748b; font-size:9px; display:block;">VITESSE</span>
              <strong style="font-size:12px;">${Math.round(item.speed)} km/h</strong>
            </div>
            <div>
              <span style="color:#64748b; font-size:9px; display:block;">DIST. JOUR</span>
              <strong style="font-size:12px;">${Math.round(item.distanceToday)} km</strong>
            </div>
          </div>
          <div style="display:flex; gap:4px; margin-bottom:4px;">
            <button onclick="window.dispatchEvent(new CustomEvent('map-focus-vehicle', { detail: '${item.id}' }))" style="
              flex:1;
              background:#0ea5e9;
              color:#ffffff;
              border:none;
              padding:5px 8px;
              border-radius:6px;
              font-size:10px;
              font-weight:700;
              cursor:pointer;
            ">Centrer</button>
            <button onclick="window.dispatchEvent(new CustomEvent('map-track-vehicle', { detail: '${item.id}' }))" style="
              flex:1;
              background:#0f172a;
              color:#ffffff;
              border:none;
              padding:5px 8px;
              border-radius:6px;
              font-size:10px;
              font-weight:700;
              cursor:pointer;
            ">Tracer</button>
          </div>
          <div style="display:flex; gap:4px;">
            <a href="https://www.google.com/maps/search/?api=1&query=${item.last?.lat},${item.last?.lng}" target="_blank" rel="noopener noreferrer" style="
              flex:1;
              text-align:center;
              text-decoration:none;
              background:#ffffff;
              border:1px solid #cbd5e1;
              color:#1e293b;
              padding:4px 6px;
              border-radius:6px;
              font-size:10px;
              font-weight:700;
              display:flex;
              align-items:center;
              justify-content:center;
              gap:3px;
            ">
              <span style="color:#4285F4; font-weight:900;">G</span>oogle Maps ↗
            </a>
            <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${item.last?.lat},${item.last?.lng}" target="_blank" rel="noopener noreferrer" style="
              flex:1;
              text-align:center;
              text-decoration:none;
              background:#ffffff;
              border:1px solid #cbd5e1;
              color:#1e293b;
              padding:4px 6px;
              border-radius:6px;
              font-size:10px;
              font-weight:700;
              display:flex;
              align-items:center;
              justify-content:center;
              gap:3px;
            ">
              Street View ↗
            </a>
          </div>
        </div>
      `);

      marker.addTo(layer);
    });

    if (!autoFitDoneRef.current && visibleItems.length > 0) {
      fitToVisible();
      autoFitDoneRef.current = true;
    }
  }, [selectedId, visibleItems, fitToVisible]);

  // Window event listeners for Leaflet popups
  useEffect(() => {
    const handleFocusEvent = (e: any) => {
      const id = e.detail;
      setSelectedId(id);
      focusSelected(16);
    };
    const handleTrackEvent = (e: any) => {
      const id = e.detail;
      setSelectedId(id);
      setActiveDeckTab("trajet");
      loadVehicleHistory(id);
    };
    window.addEventListener("map-focus-vehicle", handleFocusEvent);
    window.addEventListener("map-track-vehicle", handleTrackEvent);
    return () => {
      window.removeEventListener("map-focus-vehicle", handleFocusEvent);
      window.removeEventListener("map-track-vehicle", handleTrackEvent);
    };
  }, [focusSelected]);

  // Follow Selected Mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !followSelected || !selectedItem?.hasPosition || !selectedItem.last || isPlaying) return;
    map.panTo([selectedItem.last.lat, selectedItem.last.lng], { animate: true, duration: 0.3 });
  }, [followSelected, isPlaying, selectedItem?.last?.lat, selectedItem?.last?.lng]);

  // Resize map when deck opens/closes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(timer);
  }, [deckOpen, activeDeckTab]);

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)] max-h-screen overflow-hidden bg-background">
      {/* 2026 FLOATING TOP COMMAND HUD */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Brand Telemetry & Filter Capsules */}
        <div className="flex items-center gap-1.5 bg-background/85 dark:bg-slate-950/85 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-3xl p-1.5 px-3 shadow-2xl pointer-events-auto transition-all">
          <div className="flex items-center gap-2 pr-2 border-r border-border/50">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black tracking-wider text-foreground uppercase hidden sm:inline">
              SFT <span className="text-primary">LIVE GPS</span>
            </span>
          </div>

          {/* Quick Filter Capsules */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-2xl text-[11px] font-bold transition-all ${
                filter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Tous <span className="ml-1 opacity-75">{stats.total}</span>
            </button>
            <button
              onClick={() => setFilter("moving")}
              className={`px-2.5 py-1 rounded-2xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                filter === "moving"
                  ? "bg-emerald-600 text-white shadow-xs shadow-emerald-500/20"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Mouvement <span className="ml-0.5 opacity-80">{stats.moving}</span>
            </button>
            <button
              onClick={() => setFilter("online")}
              className={`px-2.5 py-1 rounded-2xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                filter === "online"
                  ? "bg-amber-600 text-white shadow-xs shadow-amber-500/20"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Arrêt <span className="ml-0.5 opacity-80">{stats.online}</span>
            </button>
            <button
              onClick={() => setFilter("offline")}
              className={`px-2.5 py-1 rounded-2xl text-[11px] font-bold transition-all hidden md:flex items-center gap-1.5 ${
                filter === "offline"
                  ? "bg-rose-600 text-white shadow-xs shadow-rose-500/20"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Hors ligne <span className="ml-0.5 opacity-80">{stats.offline}</span>
            </button>
          </div>
        </div>

        {/* Center / Right: Action Dock */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Search Pill */}
          <div className="relative bg-background/85 dark:bg-slate-950/85 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-3xl p-1 shadow-2xl flex items-center w-40 sm:w-60 focus-within:w-72 transition-all">
            <Search className="h-4 w-4 ml-2 text-muted-foreground shrink-0" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher véhicule..."
              className="h-8 border-0 bg-transparent text-xs font-semibold focus-visible:ring-0 placeholder:text-muted-foreground/60"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-muted-foreground hover:text-foreground px-2"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sync Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={refreshGps}
            disabled={isFetching}
            className="rounded-3xl h-10 px-3.5 bg-background/85 dark:bg-slate-950/85 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-2xl font-bold text-xs hover:scale-105 transition-transform"
            title="Synchroniser balises GPS"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            <span className="ml-1.5 hidden md:inline">{isFetching ? "Sync..." : "Sync GPS"}</span>
          </Button>

          {/* Quick 1-Click Layer Switcher Pills */}
          <div className="hidden lg:flex items-center gap-1 bg-background/85 dark:bg-slate-950/85 backdrop-blur-2xl border border-white/10 dark:border-white/5 p-1 rounded-3xl shadow-xl">
            {[
              { id: "google_hybrid", label: "Google Hybride", short: "Hybride" },
              { id: "google_roadmap", label: "Google Routier", short: "Routier" },
              { id: "google_traffic", label: "Google Trafic", short: "Trafic" },
              { id: "satellite", label: "Satellite ESRI", short: "Satellite" },
              { id: "dark", label: "Cyber Dark", short: "Dark" }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMapTheme(t.id as MapTheme)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mapTheme === t.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
                title={t.label}
              >
                <span>{t.short}</span>
                {mapTheme === t.id && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
              </button>
            ))}
          </div>

          {/* Map Layer Popover Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="rounded-3xl h-10 px-3 bg-background/85 dark:bg-slate-950/85 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-2xl font-bold text-xs"
              >
                <Layers className="h-4 w-4 text-primary" />
                <span className="ml-1.5 hidden xl:inline">{tileCatalog[mapTheme].label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[3000] w-64 rounded-2xl border border-white/10 backdrop-blur-2xl bg-card/95 p-1.5 shadow-2xl max-h-[85vh] overflow-y-auto pointer-events-auto">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-primary px-2 py-1 flex items-center justify-between">
                <span>Google Maps (gl=MA • hl=fr)</span>
                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">Officiel</span>
              </DropdownMenuLabel>
              {Object.entries(tileCatalog)
                .filter(([_, meta]) => meta.isGoogle)
                .map(([key, meta]) => (
                  <DropdownMenuItem
                    key={key}
                    onSelect={() => setMapTheme(key as MapTheme)}
                    onClick={() => setMapTheme(key as MapTheme)}
                    className={`rounded-xl cursor-pointer py-2 px-3 text-xs flex flex-col items-start gap-0.5 ${
                      mapTheme === key ? "bg-primary/10 text-primary font-black" : "font-semibold"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-1.5">
                        {meta.label}
                        {mapTheme === key && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </span>
                      {meta.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground">
                          {meta.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal">{meta.description}</span>
                  </DropdownMenuItem>
                ))}

              <DropdownMenuSeparator className="my-1.5" />

              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-1">
                Autres Thèmes
              </DropdownMenuLabel>
              {Object.entries(tileCatalog)
                .filter(([_, meta]) => !meta.isGoogle)
                .map(([key, meta]) => (
                  <DropdownMenuItem
                    key={key}
                    onSelect={() => setMapTheme(key as MapTheme)}
                    onClick={() => setMapTheme(key as MapTheme)}
                    className={`rounded-xl cursor-pointer py-2 px-3 text-xs flex flex-col items-start gap-0.5 ${
                      mapTheme === key ? "bg-primary/10 text-primary font-black" : "font-semibold"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {meta.label}
                      {mapTheme === key && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">{meta.description}</span>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fit Bounds */}
          <Button
            size="icon"
            variant="outline"
            onClick={fitToVisible}
            className="rounded-full h-10 w-10 bg-background/85 dark:bg-slate-950/85 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-2xl text-muted-foreground hover:text-foreground"
            title="Ajuster vue sur tous les véhicules"
          >
            <Focus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* FULL-WIDTH LEAFLET MAP CONTAINER */}
      <div ref={mapContainerRef} className="h-full w-full bg-slate-900" />

      {/* FLOATING BOTTOM REPLAY SCRUBBER (Appears when route is loaded) */}
      {routePoints.length >= 2 && (
        <div className="absolute bottom-5 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[620px] z-[1000] bg-background/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-primary/30 rounded-3xl p-3 sm:p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-primary/10 text-primary">
                <Route className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs font-black tracking-tight flex items-center gap-1.5">
                  <span>Relecture Trajet : {selectedItem?.label}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 font-bold">
                    {routePoints.length} pts
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground font-semibold">
                  Distance: {routeStats.distanceKm} km • Arrêts: {detectedStops.length}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Playback speed multiplier */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2 rounded-xl text-xs font-bold border-border/60">
                    {playSpeedMultiplier}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  {[0.5, 1, 2, 5, 10].map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => setPlaySpeedMultiplier(s)}
                      className="cursor-pointer font-bold text-xs"
                    >
                      {s}x Vitesse
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  stopPlayback();
                  clearRouteOverlays();
                  setRoutePoints([]);
                }}
                className="h-8 px-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                ✕ Fermer
              </Button>
            </div>
          </div>

          {/* Interactive Scrubber Slider */}
          <div className="space-y-1.5 pt-1">
            <Slider
              value={[playbackIndex]}
              max={routePoints.length - 1}
              step={1}
              onValueChange={(val) => handleSeek(val[0])}
              className="cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span>
                {routePoints[playbackIndex]
                  ? new Date(routePoints[playbackIndex].timestamp).toLocaleTimeString()
                  : "-"}
              </span>
              <span className="font-black text-primary">
                {routePoints[playbackIndex] ? `${Math.round(routePoints[playbackIndex].speed || 0)} km/h` : "0 km/h"}
              </span>
              <span>
                {routePoints[routePoints.length - 1]
                  ? new Date(routePoints[routePoints.length - 1].timestamp).toLocaleTimeString()
                  : "-"}
              </span>
            </div>
          </div>

          {/* Media Buttons */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <Button
              size="icon"
              variant="outline"
              onClick={() => handleSeek(playbackIndex - 10)}
              className="h-8 w-8 rounded-full border-border/60"
              title="-10 points"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={togglePlay}
              className="rounded-2xl px-5 h-9 font-black bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause className="h-4 w-4 mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
              {isPlaying ? "Pause" : "Lire"}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => handleSeek(playbackIndex + 10)}
              className="h-8 w-8 rounded-full border-border/60"
              title="+10 points"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 2026 FLOATING TRANSLUCENT BOTTOM "PARC / FLOTTE" BUTTON (Inspired by Reference Image) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto transition-all duration-300 ${
          routePoints.length >= 2 ? "bottom-24" : "bottom-6"
        }`}
      >
        <button
          type="button"
          onClick={() => setDeckOpen(!deckOpen)}
          className="group relative flex items-center gap-2.5 sm:gap-3 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-slate-900/60 hover:bg-slate-900/80 dark:bg-slate-950/65 dark:hover:bg-slate-950/85 backdrop-blur-xl border border-white/20 hover:border-emerald-400/50 shadow-[0_15px_35px_rgba(0,0,0,0.35)] text-white font-black text-xs sm:text-sm tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/10"
        >
          <span className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 group-hover:bg-emerald-500/30 transition-colors">
            <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
          <span className="font-extrabold text-slate-100 tracking-tight">Parc</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 shadow-xs">
            {stats.total}
          </span>
          {deckOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-y-0.5" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-300 transition-transform group-hover:-translate-y-0.5" />
          )}
        </button>
      </div>

      {/* 2026 FLOATING RIGHT ACTION DOCK (Inspired by Reference Image) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-center gap-2 pointer-events-auto">
        {/* Zoom In */}
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="h-10 w-10 rounded-full bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-xl border border-white/20 text-white shadow-xl hover:bg-slate-900/90 hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-bold"
          title="Zoomer +"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="h-10 w-10 rounded-full bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-xl border border-white/20 text-white shadow-xl hover:bg-slate-900/90 hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-bold"
          title="Dézoomer -"
        >
          <Minus className="h-4 w-4" />
        </button>

        {/* Radar / Locate */}
        <button
          type="button"
          onClick={() => {
            if (selectedItem) {
              focusSelected(16);
            } else if (visibleItems.length) {
              setSelectedId(visibleItems[0].id);
              focusSelected(15);
            }
          }}
          className="h-10 w-10 rounded-full bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-xl border border-white/20 text-white shadow-xl hover:bg-slate-900/90 hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-emerald-400"
          title="Localiser véhicule actif"
        >
          <Radio className="h-4 w-4 animate-pulse" />
        </button>

        {/* Layers Switcher Popover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-10 w-10 rounded-full bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-xl border border-white/20 text-white shadow-xl hover:bg-slate-900/90 hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-primary"
              title="Changer de carte"
            >
              <Layers className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[3000] w-64 rounded-2xl border border-white/10 backdrop-blur-2xl bg-card/95 p-1.5 shadow-2xl max-h-[85vh] overflow-y-auto pointer-events-auto">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-primary px-2 py-1 flex items-center justify-between">
              <span>Google Maps (gl=MA • hl=fr)</span>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">Officiel</span>
            </DropdownMenuLabel>
            {Object.entries(tileCatalog)
              .filter(([_, meta]) => meta.isGoogle)
              .map(([key, meta]) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => setMapTheme(key as MapTheme)}
                  onClick={() => setMapTheme(key as MapTheme)}
                  className={`rounded-xl cursor-pointer py-2 px-3 text-xs flex flex-col items-start gap-0.5 ${
                    mapTheme === key ? "bg-primary/10 text-primary font-black" : "font-semibold"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-1.5">
                      {meta.label}
                      {mapTheme === key && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </span>
                    {meta.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground">
                        {meta.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-normal">{meta.description}</span>
                </DropdownMenuItem>
              ))}

            <DropdownMenuSeparator className="my-1.5" />

            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-1">
              Autres Thèmes
            </DropdownMenuLabel>
            {Object.entries(tileCatalog)
              .filter(([_, meta]) => !meta.isGoogle)
              .map(([key, meta]) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => setMapTheme(key as MapTheme)}
                  onClick={() => setMapTheme(key as MapTheme)}
                  className={`rounded-xl cursor-pointer py-2 px-3 text-xs flex flex-col items-start gap-0.5 ${
                    mapTheme === key ? "bg-primary/10 text-primary font-black" : "font-semibold"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {meta.label}
                    {mapTheme === key && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">{meta.description}</span>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Global Fleet Fit */}
        <button
          type="button"
          onClick={fitToVisible}
          className="h-10 w-10 rounded-full bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-xl border border-white/20 text-white shadow-xl hover:bg-slate-900/90 hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-slate-200"
          title="Ajuster vue sur tous les véhicules"
        >
          <Focus className="h-4 w-4" />
        </button>
      </div>

      {/* 2026 FLOATING COMPACT FLEET MODAL (Centered 2026 VisionOS Card) */}
      {deckOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-5 pointer-events-none">
          {/* Subtle backdrop blur */}
          <div
            onClick={() => setDeckOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-xs pointer-events-auto transition-opacity animate-in fade-in duration-200"
          />

          {/* Centered Floating Glass Card */}
          <div className="relative pointer-events-auto w-full max-w-[540px] max-h-[82vh] sm:max-h-[640px] bg-slate-900/92 dark:bg-slate-950/95 backdrop-blur-3xl border border-white/20 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] rounded-[2.5rem] overflow-hidden flex flex-col text-slate-100 ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 space-y-3 shrink-0 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    <Car className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                      <span>Flotte & Parc SFT</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                        {stats.total} balises
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      Vitesse moy : {stats.avgSpeed} km/h • Aujourd'hui : {stats.totalDistanceToday} km
                    </p>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeckOpen(false)}
                  className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Fermer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Status Filter Pills inside Modal */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    filter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs scale-105"
                      : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  Tous <span className="ml-1 opacity-75">{stats.total}</span>
                </button>
                <button
                  onClick={() => setFilter("moving")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filter === "moving"
                      ? "bg-emerald-600 text-white shadow-xs scale-105"
                      : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Mouvement <span className="ml-0.5 opacity-80">{stats.moving}</span>
                </button>
                <button
                  onClick={() => setFilter("online")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filter === "online"
                      ? "bg-amber-600 text-white shadow-xs scale-105"
                      : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Arrêt <span className="ml-0.5 opacity-80">{stats.online}</span>
                </button>
                <button
                  onClick={() => setFilter("offline")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filter === "offline"
                      ? "bg-rose-600 text-white shadow-xs scale-105"
                      : "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Hors ligne <span className="ml-0.5 opacity-80">{stats.offline}</span>
                </button>
              </div>

              {/* Navigation Tabs */}
              <Tabs value={activeDeckTab} onValueChange={(v) => setActiveDeckTab(v as any)} className="w-full pt-1">
                <TabsList className="w-full grid grid-cols-4 h-9 bg-white/5 p-1 rounded-2xl border border-white/10">
                  <TabsTrigger value="flotte" className="rounded-xl font-bold text-[11px] data-[state=active]:bg-primary data-[state=active]:text-white">
                    Flotte
                  </TabsTrigger>
                  <TabsTrigger value="tableau" className="rounded-xl font-bold text-[11px] data-[state=active]:bg-primary data-[state=active]:text-white">
                    Grille
                  </TabsTrigger>
                  <TabsTrigger value="trajet" className="rounded-xl font-bold text-[11px] data-[state=active]:bg-primary data-[state=active]:text-white">
                    Trajets
                  </TabsTrigger>
                  <TabsTrigger value="capteurs" className="rounded-xl font-bold text-[11px] data-[state=active]:bg-primary data-[state=active]:text-white">
                    Diagnostic
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Deck Scrollable Body */}
            <div className="flex-1 overflow-hidden">
          {/* TAB 1: FLOTTE (Interactive Vehicle Cards) */}
          {activeDeckTab === "flotte" && (
            <ScrollArea className="h-full p-3 sm:p-4">
              <div className="space-y-2.5 pb-20">
                {visibleItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                        focusSelected(15);
                      }}
                      className={`relative overflow-hidden rounded-3xl border p-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary"
                          : "border-border/60 bg-card/60 hover:bg-muted/40 hover:border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.statusColor }}
                            />
                            <span className="font-black text-sm text-foreground truncate">{item.label}</span>
                          </div>
                          <p className="text-xs font-bold text-muted-foreground truncate pl-4.5">
                            {item.plateText} {item.city ? `• ${item.city}` : ""}
                          </p>
                        </div>
                        <Badge className={`${item.statusBadge} text-[10px] font-black shrink-0 rounded-full px-2 py-0.5`}>
                          {item.statusLabel}
                        </Badge>
                      </div>

                      {/* Mini Telemetry Grid */}
                      <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2 border-t border-border/30 text-[11px] font-bold text-muted-foreground">
                        <div className="flex items-center gap-1 bg-muted/30 p-1.5 rounded-xl">
                          <Gauge className="h-3.5 w-3.5 text-primary" />
                          <span>{Math.round(item.speed)} km/h</span>
                        </div>
                        <div className="flex items-center gap-1 bg-muted/30 p-1.5 rounded-xl">
                          <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{formatAgo(item.last?.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-muted/30 p-1.5 rounded-xl">
                          <Route className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{Math.round(item.distanceToday)} km</span>
                        </div>
                      </div>

                      {/* Battery & Fuel Levels */}
                      {(typeof item.battery === "number" || typeof item.fuel === "number") && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-1">
                          {typeof item.battery === "number" && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                                <span className="flex items-center gap-1">
                                  <Battery className="h-3 w-3 text-emerald-500" /> Batterie
                                </span>
                                <span>{Math.round(item.battery)}%</span>
                              </div>
                              <Progress value={clamp(item.battery, 0, 100)} className="h-1" />
                            </div>
                          )}
                          {typeof item.fuel === "number" && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                                <span className="flex items-center gap-1">
                                  <Fuel className="h-3 w-3 text-amber-500" /> Carburant
                                </span>
                                <span>{Math.round(item.fuel)}%</span>
                              </div>
                              <Progress value={clamp(item.fuel, 0, 100)} className="h-1" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(item.id);
                            focusSelected(16);
                          }}
                          className="flex-1 rounded-xl h-7 text-[11px] font-bold border-border/60"
                        >
                          <LocateFixed className="h-3 w-3 mr-1" />
                          Centrer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(item.id);
                            setActiveDeckTab("trajet");
                            loadVehicleHistory(item.id);
                          }}
                          className="flex-1 rounded-xl h-7 text-[11px] font-bold border-border/60"
                        >
                          <Route className="h-3 w-3 mr-1 text-primary" />
                          Trajet
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(item.id);
                            setActiveDeckTab("capteurs");
                          }}
                          className="rounded-xl h-7 px-2.5 text-[11px] font-bold border-border/60"
                          title="Fiche capteurs"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {!visibleItems.length && (
                  <div className="text-center py-16 text-muted-foreground space-y-2">
                    <Car className="h-8 w-8 mx-auto opacity-30" />
                    <p className="font-bold text-xs">Aucun véhicule trouvé</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* TAB 2: TABLEAU (High Density Grid) */}
          {activeDeckTab === "tableau" && (
            <ScrollArea className="h-full p-3 sm:p-4">
              <div className="space-y-3 pb-20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    {visibleItems.length} balises listées
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const header = "Nom,Plaque,Statut,Vitesse_kmh,Ville,Derniere_maj\n";
                      const rows = visibleItems
                        .map(
                          (v) =>
                            `"${v.label}","${v.plateText}","${v.statusLabel}",${Math.round(v.speed)},"${v.city}","${new Date(v.last?.timestamp || 0).toLocaleString()}"`
                        )
                        .join("\n");
                      const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `flotte-gps-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Flotte exportée en CSV");
                    }}
                    className="rounded-xl h-8 text-xs font-bold border-border/60"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Exporter CSV
                  </Button>
                </div>

                <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/40">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/40 font-black text-[10px] text-muted-foreground uppercase">
                        <th className="p-2.5">Véhicule</th>
                        <th className="p-2.5">Statut</th>
                        <th className="p-2.5">Vitesse</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-semibold">
                      {visibleItems.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setSelectedId(item.id);
                            focusSelected();
                          }}
                          className={`hover:bg-muted/30 cursor-pointer ${
                            item.id === selectedId ? "bg-primary/10" : ""
                          }`}
                        >
                          <td className="p-2.5">
                            <div className="font-bold text-foreground truncate max-w-[130px]">{item.label}</div>
                            <div className="text-[10px] text-muted-foreground">{item.plateText}</div>
                          </td>
                          <td className="p-2.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.statusBadge}`}>
                              {item.status === "moving" ? "Roulant" : item.status === "online" ? "Arrêt" : "Offline"}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono">{Math.round(item.speed)} km/h</td>
                          <td className="p-2.5 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(item.id);
                                focusSelected();
                              }}
                              className="h-7 w-7 rounded-lg"
                            >
                              <LocateFixed className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollArea>
          )}

          {/* TAB 3: TRAJETS (Advanced Historical Tracking Hub) */}
          {activeDeckTab === "trajet" && (
            <ScrollArea className="h-full p-3 sm:p-4">
              <div className="space-y-4 pb-20">
                {/* Target Device Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">
                    Véhicule sélectionné
                  </label>
                  <select
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      clearRouteOverlays();
                      setRoutePoints([]);
                    }}
                    className="w-full h-10 rounded-2xl bg-muted/40 border border-border/60 px-3 text-xs font-bold text-foreground focus:outline-hidden"
                  >
                    <option value="">Sélectionner un véhicule...</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.label} ({i.plateText})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Presets */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">
                    Période d'analyse
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: "1h", label: "1 Heure" },
                      { key: "today", label: "Aujourd'hui" },
                      { key: "24h", label: "24 Heures" },
                      { key: "7d", label: "7 Jours" },
                      { key: "custom", label: "Personnalisé" }
                    ].map((p) => (
                      <Button
                        key={p.key}
                        type="button"
                        size="sm"
                        variant={datePreset === p.key ? "default" : "outline"}
                        onClick={() => setDatePreset(p.key as DatePreset)}
                        className={`rounded-xl h-8 text-[11px] font-bold ${
                          p.key === "custom" ? "col-span-2" : ""
                        }`}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Pickers */}
                {datePreset === "custom" && (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground">Du</span>
                      <DatePicker value={customFrom} onChange={setCustomFrom} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground">Au</span>
                      <DatePicker value={customTo} onChange={setCustomTo} />
                    </div>
                  </div>
                )}

                {/* Load Route Button */}
                <Button
                  onClick={() => loadVehicleHistory(selectedId)}
                  disabled={!selectedId || isLoadingRoute}
                  className="w-full rounded-2xl h-11 font-black bg-primary text-primary-foreground shadow-md hover:scale-[1.02] transition-transform"
                >
                  <Route className="h-4 w-4 mr-2" />
                  {isLoadingRoute ? "Chargement du trajet..." : "Charger le trajet sur la carte"}
                </Button>

                {/* Route Analytics Cards */}
                {routePoints.length >= 2 && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-primary">Distance</span>
                        <div className="text-xl font-black text-foreground">{routeStats.distanceKm} km</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Durée</span>
                        <div className="text-xl font-black text-foreground">{routeStats.durationMin} min</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Vitesse Moyenne</span>
                        <div className="text-xl font-black text-foreground">{routeStats.avgSpeed} km/h</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Vitesse Max</span>
                        <div className="text-xl font-black text-foreground">{routeStats.maxSpeed} km/h</div>
                      </div>
                    </div>

                    {/* Detected Stops List */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                        <span>Arrêts Détectés ({detectedStops.length})</span>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {detectedStops.map((stop, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              if (mapRef.current) {
                                mapRef.current.flyTo([stop.lat, stop.lng], 16);
                              }
                            }}
                            className="p-2.5 rounded-xl border border-border/50 bg-card/60 hover:bg-muted/40 transition cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full bg-red-500/15 text-red-600 flex items-center justify-center font-black text-[10px]">
                                P
                              </span>
                              <div>
                                <span className="font-bold text-foreground">Arrêt #{i + 1}</span>
                                <div className="text-[10px] text-muted-foreground">
                                  {new Date(stop.from).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(stop.to).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                            <span className="font-black text-red-600 dark:text-red-400">
                              {stop.durationMin} min
                            </span>
                          </div>
                        ))}
                        {!detectedStops.length && (
                          <p className="text-xs text-muted-foreground text-center py-2">Aucun arrêt prolongé</p>
                        )}
                      </div>
                    </div>

                    {/* Export Actions */}
                    <div className="space-y-1.5 pt-2 border-t border-border/40">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">
                        Exporter le trajet
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportRoute("csv")}
                          className="rounded-xl h-8 text-[11px] font-bold border-border/60"
                        >
                          <Download className="h-3 w-3 mr-1 text-emerald-500" />
                          CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportRoute("gpx")}
                          className="rounded-xl h-8 text-[11px] font-bold border-border/60"
                        >
                          <Download className="h-3 w-3 mr-1 text-sky-500" />
                          GPX
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportRoute("txt")}
                          className="rounded-xl h-8 text-[11px] font-bold border-border/60"
                        >
                          <FileText className="h-3 w-3 mr-1 text-purple-500" />
                          Rapport
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* TAB 4: CAPTEURS & DIAGNOSTIC */}
          {activeDeckTab === "capteurs" && (
            <ScrollArea className="h-full p-3 sm:p-4">
              <div className="space-y-4 pb-20">
                {selectedItem ? (
                  <div className="space-y-4">
                    {/* Tachometer HUD Box */}
                    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 text-center relative overflow-hidden">
                      <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                        Vitesse Instantanée
                      </div>
                      <div className="text-5xl font-black tracking-tight text-foreground my-2 font-mono">
                        {Math.round(selectedItem.speed)}
                        <span className="text-sm font-semibold text-muted-foreground ml-1">km/h</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/80 text-xs font-bold border border-border/50">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: selectedItem.statusColor }}
                        />
                        {selectedItem.statusLabel}
                      </div>
                    </div>

                    {/* Sensor Data Grid */}
                    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-3">
                      <div className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                        Identité & Balise
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Véhicule</span>
                          <span className="font-bold text-foreground">{selectedItem.label}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Immatriculation</span>
                          <span className="font-bold text-foreground">{selectedItem.plateText}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">IMEI / ID Balise</span>
                          <span className="font-mono text-muted-foreground">{selectedItem.imei || selectedItem.id}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Conducteur</span>
                          <span className="font-semibold text-foreground">{selectedItem.driver}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                        Télémétrie Aéro-Grade
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Coordonnées GPS</span>
                          <span className="font-mono text-xs">
                            {selectedItem.last ? `${selectedItem.last.lat.toFixed(5)}, ${selectedItem.last.lng.toFixed(5)}` : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Localisation Ville</span>
                          <span className="font-bold text-foreground">{selectedItem.city || "Maroc"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Distance du Jour</span>
                          <span className="font-black text-primary">{Math.round(selectedItem.distanceToday)} km</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Dernier Rapport</span>
                          <span className="font-semibold text-muted-foreground">{formatAgo(selectedItem.last?.timestamp)}</span>
                        </div>
                      </div>

                      {/* Gauges */}
                      <div className="space-y-3 pt-2">
                        {typeof selectedItem.fuel === "number" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="flex items-center gap-1.5 text-amber-500">
                                <Fuel className="h-4 w-4" /> Niveau Réservoir
                              </span>
                              <span>{Math.round(selectedItem.fuel)}%</span>
                            </div>
                            <Progress value={clamp(selectedItem.fuel, 0, 100)} className="h-2" />
                          </div>
                        )}

                        {typeof selectedItem.battery === "number" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="flex items-center gap-1.5 text-emerald-500">
                                <Battery className="h-4 w-4" /> Tension Batterie
                              </span>
                              <span>{Math.round(selectedItem.battery)}%</span>
                            </div>
                            <Progress value={clamp(selectedItem.battery, 0, 100)} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Google Maps External Links */}
                    {selectedItem.last && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${selectedItem.last!.lat},${selectedItem.last!.lng}`,
                              "_blank"
                            );
                          }}
                          className="rounded-2xl h-10 text-xs font-bold border-border/60 hover:bg-muted"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1 text-blue-500" />
                          Google Maps ↗
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedItem.last!.lat},${selectedItem.last!.lng}`,
                              "_blank"
                            );
                          }}
                          className="rounded-2xl h-10 text-xs font-bold border-border/60 hover:bg-muted"
                        >
                          <Navigation className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                          Street View ↗
                        </Button>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        setActiveDeckTab("trajet");
                        loadVehicleHistory(selectedItem.id);
                      }}
                      className="w-full rounded-2xl h-10 font-bold bg-primary text-primary-foreground"
                    >
                      <Route className="h-4 w-4 mr-2" />
                      Voir les trajets de ce véhicule
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground space-y-2">
                    <SlidersHorizontal className="h-8 w-8 mx-auto opacity-30" />
                    <p className="font-bold text-xs">Sélectionnez un véhicule pour afficher son diagnostic</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  )}
</div>
  );
}
