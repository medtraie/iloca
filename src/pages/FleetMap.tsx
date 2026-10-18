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

// 2026 Aerospace & Telemetry Vehicle Marker (Aerodynamic Capsule + Floating Label)
function buildModernVehicleMarker(item: {
  status: "online" | "moving" | "offline";
  statusColor: string;
  speed: number;
  label: string;
  plate: string;
  selected: boolean;
}) {
  const isMoving = item.status === "moving";
  const isOnline = item.status === "online";
  const speedText = isMoving ? `${Math.round(item.speed)} km/h` : isOnline ? "Arrêt" : "Hors ligne";
  const shortLabel = (item.label || item.plate || "Véhicule").slice(0, 15);

  const glow = isMoving
    ? "rgba(16, 185, 129, 0.75)"
    : isOnline
    ? "rgba(245, 158, 11, 0.65)"
    : "rgba(148, 163, 184, 0.4)";

  const pulseAnimation = isMoving
    ? `<div style="position:absolute; inset:-8px; border-radius:9999px; background:${glow}; opacity:0.35; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
    : "";

  const selectionHalo = item.selected
    ? `<div style="position:absolute; inset:-12px; border-radius:9999px; border:2.5px solid #38bdf8; animation: pulse 1.5s infinite; box-shadow:0 0 18px #38bdf8;"></div>`
    : "";

  const html = `
    <div style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:pointer; user-select:none;">
      <!-- Vehicle Capsule -->
      <div style="position:relative; width:${item.selected ? 42 : 36}px; height:${item.selected ? 42 : 36}px; display:flex; align-items:center; justify-content:center;">
        ${selectionHalo}
        ${pulseAnimation}
        
        <div style="
          width:100%;
          height:100%;
          border-radius:9999px;
          background: linear-gradient(135deg, ${item.statusColor} 0%, rgba(15,23,42,0.95) 100%);
          border: ${item.selected ? "3px solid #ffffff" : "2px solid rgba(255,255,255,0.85)"};
          box-shadow: 0 8px 20px rgba(0,0,0,0.45), 0 0 14px ${glow};
          display:flex;
          align-items:center;
          justify-content:center;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        ">
          <!-- 2026 Aerodynamic Vehicle SVG Icon -->
          <svg width="${item.selected ? 20 : 16}" height="${item.selected ? 20 : 16}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>

        <!-- Micro status dot -->
        <div style="
          position:absolute;
          top:-2px;
          right:-2px;
          width:10px;
          height:10px;
          border-radius:9999px;
          background:${item.statusColor};
          border:1.5px solid #ffffff;
          box-shadow:0 0 6px ${item.statusColor};
        "></div>
      </div>

      <!-- 2026 Floating Telemetry Pill (Vehicle Name & Speed) -->
      <div style="
        margin-top:3px;
        display:flex;
        align-items:center;
        gap:4px;
        background: rgba(15, 23, 42, 0.90);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 2px 7px;
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
        white-space: nowrap;
        pointer-events: none;
      ">
        <span style="
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-weight: 800;
          font-size: 10px;
          letter-spacing: -0.02em;
        ">${shortLabel}</span>

        <span style="
          color: ${isMoving ? "#34d399" : isOnline ? "#fbbf24" : "#94a3b8"};
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-weight: 900;
          font-size: 9px;
          padding-left: 2px;
          border-left: 1px solid rgba(255,255,255,0.2);
        ">${speedText}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-telemetry-marker",
    html,
    iconSize: [120, 60],
    iconAnchor: [60, 18]
  });
}

function buildFlagMarker(type: "start" | "end" | "suivi_start") {
  const isStart = type === "start" || type === "suivi_start";
  const isSuivi = type === "suivi_start";
  const bg = isStart ? "#10b981" : "#8b5cf6";
  const label = isSuivi ? "Départ" : isStart ? "A" : "B";
  const html = `
    <div style="position:relative; transform:translate(-50%, -100%); display:flex; flex-direction:column; align-items:center;">
      <div style="
        padding:${isSuivi ? "2px 8px" : "0"};
        min-width:24px;
        height:24px;
        border-radius:9999px;
        background:${bg};
        color:#ffffff;
        font-weight:900;
        font-size:${isSuivi ? "10px" : "11px"};
        display:flex;
        align-items:center;
        justify-content:center;
        border:2px solid #ffffff;
        box-shadow:0 6px 16px rgba(0,0,0,0.35);
        white-space:nowrap;
        letter-spacing:0.5px;
      ">${label}</div>
      <div style="width:2px; height:6px; background:${bg};"></div>
    </div>
  `;
  return L.divIcon({
    className: "flag-marker",
    html,
    iconSize: [isSuivi ? 64 : 24, 30],
    iconAnchor: [isSuivi ? 32 : 12, 30]
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

const TRACER_COLORS = [
  { id: "cyan", label: "Cyan", value: "#06b6d4" },
  { id: "emerald", label: "Émeraude", value: "#10b981" },
  { id: "blue", label: "Bleu Royal", value: "#3b82f6" },
  { id: "violet", label: "Violet Néon", value: "#8b5cf6" },
  { id: "amber", label: "Or Solaire", value: "#f59e0b" },
  { id: "rose", label: "Rose Laser", value: "#f43f5e" },
  { id: "white", label: "Blanc Pur", value: "#ffffff" }
];

function buildCustomTraceurMarker(opts: {
  color: string;
  size: number;
  speed: number;
  label: string;
  glow: boolean;
}) {
  const { color, size, speed, label, glow } = opts;
  const innerSize = Math.max(18, Math.round(size * 0.72));
  const svgSize = Math.max(11, Math.round(size * 0.42));
  const glowShadow = glow ? `0 0 ${Math.round(size * 0.6)}px ${color}, 0 6px 16px rgba(0,0,0,0.55)` : `0 4px 12px rgba(0,0,0,0.45)`;

  const html = `
    <div style="position:relative; display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -50%); pointer-events:none;">
      <div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center;">
        ${
          glow
            ? `<div style="position:absolute; inset:-6px; border-radius:9999px; background:${color}; opacity:0.35; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ""
        }
        <div style="
          width:${innerSize}px;
          height:${innerSize}px;
          border-radius:9999px;
          background:linear-gradient(135deg, ${color} 0%, #0f172a 100%);
          border:2.5px solid #ffffff;
          box-shadow:${glowShadow};
          display:flex;
          align-items:center;
          justify-content:center;
        ">
          <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </div>
      </div>
      <div style="
        margin-top:2px;
        background:rgba(15, 23, 42, 0.92);
        border:1px solid ${color};
        padding:1px 6px;
        border-radius:9999px;
        color:#ffffff;
        font:900 9px/1.2 system-ui;
        white-space:nowrap;
        box-shadow:0 3px 10px rgba(0,0,0,0.5);
      ">
        ${label ? `${label.slice(0, 12)} • ` : ""}${Math.round(speed || 0)} km/h
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-sft-traceur-marker",
    html,
    iconSize: [size, size],
    iconAnchor: [0, 0]
  });
}

export default function FleetMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const routeGlowLineRef = useRef<L.Polyline | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const traceLineRef = useRef<L.Polyline | null>(null);
  const traceMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const playbackTimerRef = useRef<number | null>(null);
  const playbackIndexRef = useRef<number>(0);
  const autoFitDoneRef = useRef(false);

  // Core UI states
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "moving" | "offline">("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [mapTheme, setMapTheme] = useState<MapTheme>("google_hybrid");
  const [deckOpen, setDeckOpen] = useState(false);
  const [layersModalOpen, setLayersModalOpen] = useState(false);
  const [tracerModalOpen, setTracerModalOpen] = useState(false);
  const [activeDeckTab, setActiveDeckTab] = useState<"flotte" | "tableau" | "trajet" | "capteurs">("flotte");
  const [followSelected, setFollowSelected] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Traceur Customization states (persisted in localStorage)
  const [tracerColor, setTracerColor] = useState<string>(() => localStorage.getItem("sft_tracer_color") || "#06b6d4");
  const [tracerWeight, setTracerWeight] = useState<number>(() => Number(localStorage.getItem("sft_tracer_weight")) || 5);
  const [tracerSize, setTracerSize] = useState<number>(() => Number(localStorage.getItem("sft_tracer_size")) || 38);
  const [tracerGlow, setTracerGlow] = useState<boolean>(() => localStorage.getItem("sft_tracer_glow") !== "false");

  useEffect(() => {
    localStorage.setItem("sft_tracer_color", tracerColor);
    localStorage.setItem("sft_tracer_weight", String(tracerWeight));
    localStorage.setItem("sft_tracer_size", String(tracerSize));
    localStorage.setItem("sft_tracer_glow", String(tracerGlow));
  }, [tracerColor, tracerWeight, tracerSize, tracerGlow]);

  // Tracking & Replay states
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(new Date(Date.now() - 24 * 3600 * 1000));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());
  const [routePoints, setRoutePoints] = useState<HistoryPoint[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playSpeedMultiplier, setPlaySpeedMultiplier] = useState<number>(1);
  // Live Suivi vs Historical Route states
  const [routeMode, setRouteMode] = useState<"history" | "suivi" | null>(null);
  const [suiviActive, setSuiviActive] = useState<boolean>(false);
  const [showPlayerHud, setShowPlayerHud] = useState<boolean>(true);
  const suiviPointsRef = useRef<HistoryPoint[]>([]);
  const suiviStartTimeRef = useRef<number>(0);

  // GPS Data hook - polls every 6s during active suivi, 30s otherwise
  const { data: vehicles = [], error, refetch, isFetching } = useGPSwoxVehicles(suiviActive ? 6000 : 30000);

  // Normalized fleet items (including raw payload for instant traceur & history extraction)
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
        imei: v.imei,
        raw: v.raw
      };
    });
  }, [vehicles]);

  // Auto-select first vehicle when loaded
  useEffect(() => {
    if (!selectedId && items.length > 0) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

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
    if (routeGlowLineRef.current) {
      routeGlowLineRef.current.remove();
      routeGlowLineRef.current = null;
    }
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

  // Draw Route Polyline, Custom Traceur Beacon, Flags, Stops
  const renderRouteOnMap = useCallback(
    (pts: HistoryPoint[], fitBounds = true) => {
      const map = mapRef.current;
      const overlay = overlayLayerRef.current;
      if (!map || !overlay) return;

      clearRouteOverlays();
      if (pts.length < 2) return;

      const coords = pts.map((p) => [p.lat, p.lng] as [number, number]);

      // Outer neon glow polyline if enabled
      if (tracerGlow) {
        routeGlowLineRef.current = L.polyline(coords, {
          color: tracerColor,
          weight: tracerWeight * 2.4,
          opacity: 0.28,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(overlay);
      }

      // Main customizable Traceur polyline
      routeLineRef.current = L.polyline(coords, {
        color: tracerColor,
        weight: tracerWeight,
        opacity: 0.95,
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

      // Place initial/active Traceur marker so user always sees the Traceur on map
      const activeIdx = clamp(playbackIndexRef.current, 0, pts.length - 1);
      const activePt = pts[activeIdx] || pts[pts.length - 1];
      traceMarkerRef.current = L.marker([activePt.lat, activePt.lng], {
        icon: buildCustomTraceurMarker({
          color: tracerColor,
          size: tracerSize,
          speed: activePt.speed || 0,
          label: selectedItem?.label || "Traceur",
          glow: tracerGlow
        }),
        zIndexOffset: 1350
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

      if (fitBounds) {
        map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 16 });
      }
    },
    [tracerColor, tracerWeight, tracerSize, tracerGlow, selectedItem?.label]
  );

  // Draw Live Suivi Polyline & Custom Traceur Marker
  const renderSuiviOnMap = useCallback(
    (pts: HistoryPoint[], fitBounds = false) => {
      const map = mapRef.current;
      const overlay = overlayLayerRef.current;
      if (!map || !overlay || pts.length === 0) return;

      clearRouteOverlays();

      const coords = pts.map((p) => [p.lat, p.lng] as [number, number]);
      const currentPt = pts[pts.length - 1];

      // Green "Départ" Flag Marker at the initial point where Suivi was activated
      startMarkerRef.current = L.marker(coords[0], {
        icon: buildFlagMarker("suivi_start"),
        zIndexOffset: 800
      }).addTo(overlay);

      // Main customizable Traceur Polyline if at least 2 points
      if (pts.length >= 2) {
        if (tracerGlow) {
          routeGlowLineRef.current = L.polyline(coords, {
            color: tracerColor,
            weight: tracerWeight * 2.4,
            opacity: 0.35,
            lineCap: "round",
            lineJoin: "round"
          }).addTo(overlay);
        }

        routeLineRef.current = L.polyline(coords, {
          color: tracerColor,
          weight: tracerWeight,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(overlay);
      }

      // Traceur marker at latest position
      traceMarkerRef.current = L.marker([currentPt.lat, currentPt.lng], {
        icon: buildCustomTraceurMarker({
          color: tracerColor,
          size: tracerSize,
          speed: currentPt.speed || 0,
          label: selectedItem?.label || "Traceur",
          glow: tracerGlow
        }),
        zIndexOffset: 1350
      }).addTo(overlay);

      if (fitBounds) {
        if (pts.length >= 2) {
          map.fitBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 17 });
        } else {
          map.flyTo([currentPt.lat, currentPt.lng], 16, { duration: 0.6 });
        }
      }
    },
    [tracerColor, tracerWeight, tracerSize, tracerGlow, selectedItem?.label]
  );

  // Dynamically update Traceur appearance when user changes color, weight, size, or glow
  useEffect(() => {
    if (routeMode === "suivi" && suiviPointsRef.current.length > 0) {
      renderSuiviOnMap(suiviPointsRef.current, false);
    } else if (routeMode === "history" && routePoints.length >= 2) {
      renderRouteOnMap(routePoints, false);
    }
  }, [tracerColor, tracerWeight, tracerSize, tracerGlow, routeMode, renderSuiviOnMap, renderRouteOnMap, routePoints]);

  // Automatic Live Traceur when activating Suivi on a vehicle
  const activateVehicleSuiviAndTracer = useCallback(
    (targetId: string, zoomToRoute = true) => {
      const target = items.find((i) => String(i.id) === String(targetId));
      if (!target) return;
      setSelectedId(target.id);
      setFollowSelected(true);
      setSuiviActive(true);
      setRouteMode("suivi");
      setShowPlayerHud(true);
      stopPlayback();

      if (target.last && Number.isFinite(target.last.lat) && Number.isFinite(target.last.lng)) {
        const startPt: HistoryPoint = {
          lat: target.last.lat,
          lng: target.last.lng,
          speed: target.speed || 0,
          timestamp: Date.now()
        };
        suiviPointsRef.current = [startPt];
        suiviStartTimeRef.current = Date.now();
        setRoutePoints([startPt]);
        renderSuiviOnMap([startPt], zoomToRoute);
        toast.success(`Suivi & Traceur activés : ${target.label}`, {
          description: "Tracé en direct depuis cette position."
        });
      } else if (mapRef.current) {
        toast.info("En attente de la position GPS en direct...");
      }
    },
    [items, renderSuiviOnMap]
  );

  // Accumulate vehicle positions live in real-time while Suivi is active
  useEffect(() => {
    if (!suiviActive || !selectedId || routeMode !== "suivi") return;
    const currentVehicle = vehicles.find((v) => String(v.id) === String(selectedId));
    if (
      !currentVehicle?.lastPosition ||
      !Number.isFinite(currentVehicle.lastPosition.lat) ||
      !Number.isFinite(currentVehicle.lastPosition.lng)
    ) {
      return;
    }

    const curLat = currentVehicle.lastPosition.lat;
    const curLng = currentVehicle.lastPosition.lng;
    const curSpeed = currentVehicle.lastPosition.speed || currentVehicle.speed || 0;

    const prevPts = suiviPointsRef.current;
    if (prevPts.length === 0) {
      const initialPt: HistoryPoint = {
        lat: curLat,
        lng: curLng,
        speed: curSpeed,
        timestamp: Date.now()
      };
      suiviPointsRef.current = [initialPt];
      setRoutePoints([initialPt]);
      renderSuiviOnMap([initialPt], false);
      return;
    }

    const lastPt = prevPts[prevPts.length - 1];
    const distDelta = haversineKm(lastPt, { lat: curLat, lng: curLng });

    // When vehicle moves at least 2 meters (0.002 km)
    if (distDelta >= 0.002 || (curSpeed > 0 && distDelta >= 0.0005)) {
      const newPt: HistoryPoint = {
        lat: curLat,
        lng: curLng,
        speed: curSpeed,
        timestamp: Date.now()
      };
      const updatedPts = [...prevPts, newPt];
      suiviPointsRef.current = updatedPts;
      setRoutePoints(updatedPts);
      renderSuiviOnMap(updatedPts, false);

      if (followSelected && mapRef.current) {
        mapRef.current.panTo([curLat, curLng], { animate: true, duration: 0.8 });
      }
    } else {
      // Vehicle stopped or stationary: update traceur marker with latest telemetry
      if (traceMarkerRef.current) {
        traceMarkerRef.current.setLatLng([curLat, curLng]);
        traceMarkerRef.current.setIcon(
          buildCustomTraceurMarker({
            color: tracerColor,
            size: tracerSize,
            speed: curSpeed,
            label: selectedItem?.label || "Traceur",
            glow: tracerGlow
          })
        );
      }
    }
  }, [
    vehicles,
    suiviActive,
    selectedId,
    routeMode,
    followSelected,
    tracerColor,
    tracerWeight,
    tracerSize,
    tracerGlow,
    selectedItem?.label,
    renderSuiviOnMap
  ]);

  // Load Historical Route for selected vehicle
  const loadVehicleHistory = async (deviceId: string, autoPlayAfterLoad = false) => {
    const targetDeviceId = deviceId || selectedId || items[0]?.id;
    if (!targetDeviceId) {
      toast.error("Veuillez sélectionner un véhicule");
      return;
    }
    if (targetDeviceId !== selectedId) {
      setSelectedId(targetDeviceId);
    }
    setSuiviActive(false);
    setRouteMode("history");
    setShowPlayerHud(true);
    setIsLoadingRoute(true);
    stopPlayback();
    playbackIndexRef.current = 0;
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
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        toIso = endOfToday.toISOString();
      } else if (datePreset === "24h") {
        fromIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      } else if (datePreset === "7d") {
        fromIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      } else {
        const f = customFrom ? new Date(customFrom) : new Date(Date.now() - 24 * 3600 * 1000);
        const t = customTo ? new Date(customTo) : new Date();
        if (t.getHours() === 0 && t.getMinutes() === 0 && t.getSeconds() === 0) {
          t.setHours(23, 59, 59, 999);
        }
        fromIso = f.toISOString();
        toIso = t.toISOString();
      }

      const targetItem = items.find((i) => String(i.id) === String(targetDeviceId)) || selectedItem;
      const res = await gpswoxService.getDeviceHistory(targetDeviceId, fromIso, toIso, targetItem);
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
        setRouteMode("history");
        setShowPlayerHud(true);
        renderRouteOnMap(normalized, true);
        setDeckOpen(false);
        toast.success(`Trajet & Traceur activés (${normalized.length} points)`, {
          description: `Distance: ${computeRouteStats(normalized).distanceKm} km`
        });
        if (autoPlayAfterLoad) {
          setTimeout(() => startRoutePlayback(normalized), 150);
        }
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

  // Start playback on a given array of points
  const startRoutePlayback = (ptsToPlay: HistoryPoint[]) => {
    const activePts = ptsToPlay.length >= 2 ? ptsToPlay : routePoints;
    if (activePts.length < 2) return;

    stopPlayback();
    setIsPlaying(true);
    setDeckOpen(false);
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;

    if (playbackIndexRef.current >= activePts.length - 1) {
      playbackIndexRef.current = 0;
      setPlaybackIndex(0);
    }

    const baseInterval = Math.max(40, Math.round(180 / playSpeedMultiplier));

    playbackTimerRef.current = window.setInterval(() => {
      playbackIndexRef.current += 1;
      const currentIndex = playbackIndexRef.current;
      if (currentIndex >= activePts.length) {
        stopPlayback();
        toast.success("Lecture du trajet terminée");
        return;
      }

      setPlaybackIndex(currentIndex);
      const currentPoint = activePts[currentIndex];
      const currentLatLng: [number, number] = [currentPoint.lat, currentPoint.lng];

      // Trace line update
      if (!traceLineRef.current) {
        traceLineRef.current = L.polyline(
          activePts.slice(0, currentIndex + 1).map((p) => [p.lat, p.lng]),
          {
            color: "#ffffff",
            weight: Math.max(3, tracerWeight - 1),
            opacity: 0.95
          }
        ).addTo(overlay);
      } else {
        traceLineRef.current.setLatLngs(activePts.slice(0, currentIndex + 1).map((p) => [p.lat, p.lng]));
      }

      // Moving Custom Traceur Marker update
      const icon = buildCustomTraceurMarker({
        color: tracerColor,
        size: tracerSize,
        speed: currentPoint.speed || 0,
        label: selectedItem?.label || "Traceur",
        glow: tracerGlow
      });
      if (!traceMarkerRef.current) {
        traceMarkerRef.current = L.marker(currentLatLng, {
          icon,
          zIndexOffset: 1350
        }).addTo(overlay);
      } else {
        traceMarkerRef.current.setLatLng(currentLatLng);
        traceMarkerRef.current.setIcon(icon);
      }

      if (followSelected) {
        map.panTo(currentLatLng, { animate: true, duration: 0.2 });
      }
    }, baseInterval);
  };

  // Playback Control
  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (routePoints.length < 2) {
      const targetId = selectedId || items[0]?.id;
      if (targetId) {
        void loadVehicleHistory(targetId, true);
      } else {
        toast.error("Veuillez d'abord sélectionner un véhicule");
      }
      return;
    }
    startRoutePlayback(routePoints);
  };

  // Seek on scrubber
  const handleSeek = (newIndex: number) => {
    const bounded = clamp(newIndex, 0, routePoints.length - 1);
    playbackIndexRef.current = bounded;
    setPlaybackIndex(bounded);
    const point = routePoints[bounded];
    if (!point) return;

    const overlay = overlayLayerRef.current;
    if (!overlay) return;

    const currentLatLng: [number, number] = [point.lat, point.lng];

    const icon = buildCustomTraceurMarker({
      color: tracerColor,
      size: tracerSize,
      speed: point.speed || 0,
      label: selectedItem?.label || "Traceur",
      glow: tracerGlow
    });

    if (!traceMarkerRef.current) {
      traceMarkerRef.current = L.marker(currentLatLng, {
        icon,
        zIndexOffset: 1350
      }).addTo(overlay);
    } else {
      traceMarkerRef.current.setLatLng(currentLatLng);
      traceMarkerRef.current.setIcon(icon);
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

    // Build coordinate frequency map to disperse exact duplicates slightly so every vehicle is visible
    const coordCounts = new Map<string, number>();
    const dispersedPositions = visibleItems.map((item) => {
      if (!item.hasPosition || !item.last) return { item, lat: 0, lng: 0, valid: false };
      const key = `${item.last.lat.toFixed(5)},${item.last.lng.toFixed(5)}`;
      const index = coordCounts.get(key) || 0;
      coordCounts.set(key, index + 1);

      if (index === 0) {
        return { item, lat: item.last.lat, lng: item.last.lng, valid: true };
      }
      // Micro radial offset so overlapping vehicles fan out clearly
      const angle = (index * 2 * Math.PI) / 8 + (Math.floor(index / 8) * 0.4);
      const radius = 0.00035 * (1 + Math.floor(index / 8) * 0.6);
      const lat = item.last.lat + radius * Math.cos(angle);
      const lng = item.last.lng + (radius * Math.sin(angle)) / Math.cos((item.last.lat * Math.PI) / 180);
      return { item, lat, lng, valid: true };
    });

    dispersedPositions.forEach(({ item, lat, lng, valid }) => {
      if (!valid) return;
      const isSelected = item.id === selectedId;

      const marker = L.marker([lat, lng], {
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
        activateVehicleSuiviAndTracer(item.id, false);
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
            ">Suivi & Traceur</button>
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
            ">Relecture</button>
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
  }, [selectedId, visibleItems, fitToVisible, activateVehicleSuiviAndTracer]);

  // Window event listeners for Leaflet popups
  useEffect(() => {
    const handleFocusEvent = (e: any) => {
      const id = e.detail;
      activateVehicleSuiviAndTracer(id, true);
      toast.success("Suivi & Traceur activés sur la carte");
    };
    const handleTrackEvent = (e: any) => {
      const id = e.detail;
      setSelectedId(id);
      void loadVehicleHistory(id, true);
    };
    window.addEventListener("map-focus-vehicle", handleFocusEvent);
    window.addEventListener("map-track-vehicle", handleTrackEvent);
    return () => {
      window.removeEventListener("map-focus-vehicle", handleFocusEvent);
      window.removeEventListener("map-track-vehicle", handleTrackEvent);
    };
  }, [activateVehicleSuiviAndTracer]);

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
        {/* Left: Brand Telemetry & Filter Capsules (Transparent Frosted Glass) */}
        <div className="flex items-center gap-1.5 bg-slate-900/45 dark:bg-slate-950/50 backdrop-blur-2xl border border-white/20 rounded-full p-1.5 px-3.5 shadow-xl pointer-events-auto transition-all text-white">
          <div className="flex items-center gap-2 pr-2.5 border-r border-white/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black tracking-wider text-white uppercase hidden sm:inline">
              SFT <span className="text-emerald-400">LIVE GPS</span>
            </span>
          </div>

          {/* Quick Filter Capsules */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                filter === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              Tous <span className="ml-1 opacity-80">{stats.total}</span>
            </button>
            <button
              onClick={() => setFilter("moving")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                filter === "moving"
                  ? "bg-emerald-600 text-white shadow-xs shadow-emerald-500/30"
                  : "text-emerald-300 hover:bg-emerald-500/15"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Mouvement <span className="ml-0.5 opacity-90">{stats.moving}</span>
            </button>
            <button
              onClick={() => setFilter("online")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                filter === "online"
                  ? "bg-amber-600 text-white shadow-xs shadow-amber-500/30"
                  : "text-amber-300 hover:bg-amber-500/15"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Arrêt <span className="ml-0.5 opacity-90">{stats.online}</span>
            </button>
            <button
              onClick={() => setFilter("offline")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hidden md:flex items-center gap-1.5 ${
                filter === "offline"
                  ? "bg-rose-600 text-white shadow-xs shadow-rose-500/30"
                  : "text-rose-300 hover:bg-rose-500/15"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Hors ligne <span className="ml-0.5 opacity-90">{stats.offline}</span>
            </button>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH LEAFLET MAP CONTAINER */}
      <div ref={mapContainerRef} className="h-full w-full bg-slate-900" />

      {/* FLOATING BOTTOM PLAYER HUD (Replay for history OR Real-time HUD for live suivi) */}
      {showPlayerHud && (routePoints.length >= 2 || (routeMode === "suivi" && routePoints.length >= 1)) && (
        <div className="absolute bottom-5 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[680px] z-[1000] bg-slate-950/90 backdrop-blur-3xl border border-white/20 rounded-3xl p-3 sm:p-4 shadow-2xl space-y-2.5 text-white animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="p-2 rounded-2xl border shrink-0"
                style={{
                  backgroundColor: `${tracerColor}25`,
                  borderColor: `${tracerColor}55`,
                  color: tracerColor
                }}
              >
                {routeMode === "suivi" ? <Radio className="h-4 w-4 animate-pulse" /> : <Route className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-black tracking-tight flex items-center gap-1.5">
                  <span className="truncate">
                    {routeMode === "suivi" ? `Suivi en Direct : ${selectedItem?.label || "Véhicule"}` : `Traceur & Trajet : ${selectedItem?.label}`}
                  </span>
                  {routeMode === "suivi" ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-400/50 bg-emerald-500/20 text-emerald-300 font-bold shrink-0 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      EN DIRECT
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/30 text-white font-bold shrink-0">
                      {routePoints.length} pts
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 font-semibold truncate">
                  {routeMode === "suivi" ? (
                    <span>
                      Distance: <strong className="text-white">{routeStats.distanceKm} km</strong> • Vitesse: <strong style={{ color: tracerColor }}>{Math.round(selectedItem?.speed || 0)} km/h</strong> • {routePoints.length} points
                    </span>
                  ) : (
                    <span>
                      Distance: {routeStats.distanceKm} km • Arrêts: {detectedStops.length} • Vitesse max: {routeStats.maxSpeed} km/h
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Customize Traceur Color & Size Button */}
              <button
                type="button"
                onClick={() => setTracerModalOpen(true)}
                className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-bold text-white flex items-center gap-1.5 transition"
                title="Personnaliser couleur et taille du traceur"
              >
                <span
                  className="h-3 w-3 rounded-full border border-white"
                  style={{ backgroundColor: tracerColor }}
                />
                <span className="hidden sm:inline">Traceur</span>
                <span className="text-[10px] text-slate-300">{tracerWeight}px</span>
              </button>

              {routeMode === "history" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2 rounded-xl text-xs font-bold border-white/20 bg-white/10 text-white hover:bg-white/20">
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
              )}

              {routeMode === "suivi" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSuiviActive(false);
                    setRouteMode(null);
                    clearRouteOverlays();
                    setRoutePoints([]);
                    suiviPointsRef.current = [];
                    setShowPlayerHud(false);
                    toast.info("Suivi en direct désactivé");
                  }}
                  className="h-8 px-2.5 rounded-xl text-xs bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 hover:text-white border border-rose-400/30 font-bold transition flex items-center gap-1"
                  title="Arrêter le suivi en direct"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Arrêter</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    stopPlayback();
                    clearRouteOverlays();
                    setRoutePoints([]);
                    setRouteMode(null);
                    setShowPlayerHud(false);
                  }}
                  className="h-8 px-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10"
                  title="Fermer le lecteur"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Body of HUD: Live Suivi vs History Replay */}
          {routeMode === "suivi" ? (
            <div className="pt-1.5 pb-0.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 bg-white/[0.04] px-3 py-2 rounded-2xl border border-white/10">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                  Départ : {routePoints[0] ? new Date(routePoints[0].timestamp).toLocaleTimeString() : "--:--"}
                </span>
                <span className="font-mono text-emerald-300">
                  Cadence : 6s • {followSelected ? "Centrage auto ACTIF" : "Centrage libre"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedItem?.last) {
                      mapRef.current?.flyTo([selectedItem.last.lat, selectedItem.last.lng], 17, { duration: 0.6 });
                      setFollowSelected(true);
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-300 text-[10px] font-black transition"
                >
                  Centrer
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Interactive Scrubber Slider for History */}
              <div className="space-y-1.5 pt-1">
                <Slider
                  value={[playbackIndex]}
                  max={Math.max(1, routePoints.length - 1)}
                  step={1}
                  onValueChange={(val) => handleSeek(val[0])}
                  className="cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>
                    {routePoints[playbackIndex]
                      ? new Date(routePoints[playbackIndex].timestamp).toLocaleTimeString()
                      : "-"}
                  </span>
                  <span className="font-black" style={{ color: tracerColor }}>
                    {routePoints[playbackIndex] ? `${Math.round(routePoints[playbackIndex].speed || 0)} km/h` : "0 km/h"}
                  </span>
                  <span>
                    {routePoints[routePoints.length - 1]
                      ? new Date(routePoints[routePoints.length - 1].timestamp).toLocaleTimeString()
                      : "-"}
                  </span>
                </div>
              </div>

              {/* Media Buttons for History */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleSeek(playbackIndex - 5)}
                  className="h-8 w-8 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
                  title="-5 points"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  onClick={togglePlay}
                  style={{ backgroundColor: tracerColor }}
                  className="rounded-2xl px-5 h-9 font-black text-slate-950 shadow-md hover:scale-105 transition-transform"
                >
                  {isPlaying ? <Pause className="h-4 w-4 mr-1.5 fill-current" /> : <Play className="h-4 w-4 mr-1.5 fill-current ml-0.5" />}
                  {isPlaying ? "Pause" : "Lire Vidéo"}
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleSeek(playbackIndex + 5)}
                  className="h-8 w-8 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
                  title="+5 points"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2026 FLOATING TRANSLUCENT BOTTOM "PARC / FLOTTE" BUTTON (Inspired by Reference Image) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto transition-all duration-300 ${
          showPlayerHud && (routePoints.length >= 2 || (routeMode === "suivi" && routePoints.length >= 1)) ? "bottom-44" : "bottom-6"
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

      {/* 2026 FLOATING RIGHT ACTION DOCK (Ultra-Translucent Frosted Glass) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-center gap-2.5 pointer-events-auto">
        {/* Zoom In */}
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-bold"
          title="Zoomer +"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-bold"
          title="Dézoomer -"
        >
          <Minus className="h-4 w-4" />
        </button>

        {/* Suivi & Traceur Live Trigger */}
        <button
          type="button"
          onClick={() => {
            const targetId = selectedId || visibleItems[0]?.id;
            if (targetId) {
              if (suiviActive) {
                setShowPlayerHud(true);
                setFollowSelected(true);
                if (selectedItem?.last) {
                  mapRef.current?.flyTo([selectedItem.last.lat, selectedItem.last.lng], 17, { duration: 0.6 });
                }
              } else {
                activateVehicleSuiviAndTracer(targetId, true);
              }
            }
          }}
          className={`h-10 w-10 rounded-full backdrop-blur-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center ${
            suiviActive
              ? "bg-emerald-500/30 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400/50"
              : "bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 border-white/30 text-emerald-400"
          }`}
          title={suiviActive ? "Suivi en direct ACTIF (Cliquer pour centrer)" : "Activer Suivi & Traceur du véhicule"}
        >
          <Radio className="h-4 w-4 animate-pulse" />
        </button>

        {/* Reopen Player HUD if closed */}
        {!showPlayerHud && (routePoints.length >= 2 || (routeMode === "suivi" && routePoints.length >= 1)) && (
          <button
            type="button"
            onClick={() => setShowPlayerHud(true)}
            className="h-10 w-10 rounded-full bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-300 shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center animate-pulse"
            title="Afficher le lecteur de trajet"
          >
            <Play className="h-4 w-4 fill-current ml-0.5" />
          </button>
        )}

        {/* Traceur Style Customization Trigger (Couleur & Taille) */}
        <button
          type="button"
          onClick={() => setTracerModalOpen(true)}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center relative"
          title="Personnaliser le Traceur (Couleur & Taille)"
        >
          <SlidersHorizontal className="h-4 w-4" style={{ color: tracerColor }} />
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border border-white"
            style={{ backgroundColor: tracerColor }}
          />
        </button>

        {/* Layers Switcher Modal Trigger */}
        <button
          type="button"
          onClick={() => setLayersModalOpen(true)}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-primary shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          title="Styles & Cartographie Google Maps"
        >
          <Layers className="h-4 w-4" />
        </button>

        {/* Global Fleet Fit */}
        <button
          type="button"
          onClick={fitToVisible}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          title="Ajuster vue sur tous les véhicules"
        >
          <Focus className="h-4 w-4" />
        </button>
      </div>

      {/* 2026 FLOATING VISIONOS TRACEUR CUSTOMIZATION MODAL (Couleur & Taille) */}
      {tracerModalOpen && (
        <div className="fixed inset-0 z-[1650] flex items-center justify-center p-3 sm:p-5 pointer-events-none">
          <div
            onClick={() => setTracerModalOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto transition-opacity animate-in fade-in duration-200"
          />
          <div className="relative pointer-events-auto w-full max-w-[460px] bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-3xl border border-white/20 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] rounded-[2.5rem] overflow-hidden flex flex-col text-slate-100 ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span
                  className="h-10 w-10 rounded-2xl border flex items-center justify-center shadow-inner"
                  style={{
                    backgroundColor: `${tracerColor}25`,
                    borderColor: `${tracerColor}55`,
                    color: tracerColor
                  }}
                >
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-black tracking-tight text-white">
                    Style & Design du Traceur
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Personnalisez la couleur, l'épaisseur et la taille du traceur
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setTracerModalOpen(false)}
                className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Color Picker Swatches */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-300">
                  <span>Couleur du Traceur</span>
                  <span className="font-mono text-[11px]" style={{ color: tracerColor }}>
                    {tracerColor}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {TRACER_COLORS.map((c) => {
                    const active = tracerColor.toLowerCase() === c.value.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setTracerColor(c.value)}
                        className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                          active
                            ? "border-white bg-white/15 text-white scale-105 shadow-lg"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/60"
                          style={{ backgroundColor: c.value, boxShadow: active ? `0 0 10px ${c.value}` : "none" }}
                        />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                  <label className="h-9 px-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer">
                    <input
                      type="color"
                      value={tracerColor}
                      onChange={(e) => setTracerColor(e.target.value)}
                      className="h-5 w-5 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span>Autre</span>
                  </label>
                </div>
              </div>

              {/* Line Thickness */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-300">
                  <span>Épaisseur de la Ligne</span>
                  <span className="font-mono text-emerald-400">{tracerWeight} px</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Fin (3px)", val: 3 },
                    { label: "Normal (5px)", val: 5 },
                    { label: "Large (8px)", val: 8 },
                    { label: "Ultra (11px)", val: 11 }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setTracerWeight(opt.val)}
                      className={`h-8 rounded-xl text-[11px] font-bold border transition ${
                        tracerWeight === opt.val
                          ? "bg-white/20 border-white text-white font-black"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Slider
                  value={[tracerWeight]}
                  min={2}
                  max={14}
                  step={1}
                  onValueChange={(v) => setTracerWeight(v[0] || 5)}
                />
              </div>

              {/* Traceur Icon Size */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-300">
                  <span>Taille du Traceur (Icône)</span>
                  <span className="font-mono text-emerald-400">{tracerSize} px</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Petit", val: 28 },
                    { label: "Moyen", val: 38 },
                    { label: "Grand", val: 48 },
                    { label: "XL", val: 58 }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setTracerSize(opt.val)}
                      className={`h-8 rounded-xl text-[11px] font-bold border transition ${
                        tracerSize === opt.val
                          ? "bg-white/20 border-white text-white font-black"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Slider
                  value={[tracerSize]}
                  min={24}
                  max={64}
                  step={2}
                  onValueChange={(v) => setTracerSize(v[0] || 38)}
                />
              </div>

              {/* Glow Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div>
                  <div className="text-xs font-bold text-white">Effet Halo Néon Lumineux</div>
                  <div className="text-[10px] text-slate-400">Double tracé lumineux haute visibilité</div>
                </div>
                <Switch checked={tracerGlow} onCheckedChange={setTracerGlow} />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetId = selectedId || items[0]?.id;
                    if (targetId) {
                      activateVehicleSuiviAndTracer(targetId, true);
                    }
                    setTracerModalOpen(false);
                  }}
                  style={{ backgroundColor: tracerColor }}
                  className="flex-1 h-10 rounded-2xl font-black text-xs text-slate-950 shadow-lg transition hover:opacity-90"
                >
                  Appliquer & Voir Traceur sur la Carte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2026 FLOATING VISIONOS MAP LAYERS MODAL (Centered 2026 Card) */}
      {layersModalOpen && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center p-3 sm:p-5 pointer-events-none">
          <div
            onClick={() => setLayersModalOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto transition-opacity animate-in fade-in duration-200"
          />
          <div className="relative pointer-events-auto w-full max-w-[600px] max-h-[85vh] bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-3xl border border-white/20 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] rounded-[2.5rem] overflow-hidden flex flex-col text-slate-100 ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                  <Layers className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>Styles & Cartographie 2026</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/25 text-primary border border-primary/40">
                      VisionOS
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Google Maps Officiel (Maroc • gl=MA • hl=fr) & Imagerie Satellite
                  </p>
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setLayersModalOpen(false)}
                className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body with Custom Glass Scrollbar */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {/* Google Maps Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-primary px-1">
                  <span>Google Maps Officiel (Maroc)</span>
                  <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full">Haute Précision</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(tileCatalog)
                    .filter(([_, meta]) => meta.isGoogle)
                    .map(([key, meta]) => {
                      const isActive = mapTheme === key;
                      return (
                        <div
                          key={key}
                          onClick={() => {
                            setMapTheme(key as MapTheme);
                            toast.success(`Carte changée: ${meta.label}`);
                          }}
                          className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isActive
                              ? "bg-primary/20 border-primary shadow-lg shadow-primary/20 ring-1 ring-primary"
                              : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/25"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-extrabold text-sm text-white flex items-center gap-2">
                                <span>{meta.label}</span>
                                {isActive && (
                                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                                {meta.description}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/10 text-slate-300 shrink-0 border border-white/10">
                              Google
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400">
                            <span>Zoom max: {meta.maxZoom}x</span>
                            {isActive ? (
                              <span className="text-primary font-black flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Actif
                              </span>
                            ) : (
                              <span className="group-hover:text-white transition-colors">Sélectionner →</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Other Themes Section */}
              <div className="space-y-2.5">
                <div className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                  Styles Spécialisés & Télémétrie
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(tileCatalog)
                    .filter(([_, meta]) => !meta.isGoogle)
                    .map(([key, meta]) => {
                      const isActive = mapTheme === key;
                      return (
                        <div
                          key={key}
                          onClick={() => {
                            setMapTheme(key as MapTheme);
                            toast.success(`Carte changée: ${meta.label}`);
                          }}
                          className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isActive
                              ? "bg-primary/20 border-primary shadow-lg shadow-primary/20 ring-1 ring-primary"
                              : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/25"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-extrabold text-sm text-white flex items-center gap-2">
                                <span>{meta.label}</span>
                                {isActive && (
                                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                                {meta.description}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/10 text-slate-300 shrink-0 border border-white/10">
                              {key === "dark" ? "Cyberpunk" : key === "satellite" ? "Aéro" : "OSM"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400">
                            <span>Zoom max: {meta.maxZoom}x</span>
                            {isActive ? (
                              <span className="text-primary font-black flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Actif
                              </span>
                            ) : (
                              <span className="group-hover:text-white transition-colors">Sélectionner →</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2026 FLOATING COMPACT FLEET MODAL (Centered 2026 VisionOS Card) */}
      {deckOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-5 pointer-events-none">
          {/* Subtle backdrop blur */}
          <div
            onClick={() => setDeckOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-xs pointer-events-auto transition-opacity animate-in fade-in duration-200"
          />

          {/* Centered Floating Glass Card */}
          <div className="relative pointer-events-auto w-full max-w-[540px] h-[84vh] max-h-[680px] min-h-[440px] bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-3xl border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] rounded-[2.5rem] overflow-hidden flex flex-col text-slate-100 ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 space-y-3 shrink-0 bg-white/[0.02]">
              {/* Top Grab Handle */}
              <div className="w-12 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2" />

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

              {/* Quick Search inside Modal */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher véhicule, immatriculation, ville..."
                  className="w-full h-8 pl-8 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-400/60 transition"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
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
            <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
              <style>{`
                .sft-fleet-scroll {
                  scrollbar-width: thin !important;
                  scrollbar-color: #10b981 rgba(255, 255, 255, 0.12) !important;
                }
                .sft-fleet-scroll::-webkit-scrollbar {
                  width: 9px !important;
                  display: block !important;
                }
                .sft-fleet-scroll::-webkit-scrollbar-track {
                  background: rgba(255, 255, 255, 0.08) !important;
                  border-radius: 9999px !important;
                  margin: 6px 0 !important;
                }
                .sft-fleet-scroll::-webkit-scrollbar-thumb {
                  background: #10b981 !important;
                  border-radius: 9999px !important;
                  border: 2px solid rgba(15, 23, 42, 0.9) !important;
                  box-shadow: 0 0 10px rgba(16, 185, 129, 0.6) !important;
                }
                .sft-fleet-scroll::-webkit-scrollbar-thumb:hover {
                  background: #34d399 !important;
                }
              `}</style>
          {/* TAB 1: FLOTTE (Interactive Vehicle Cards) */}
          {activeDeckTab === "flotte" && (
            <div className="flex-1 min-h-0 overflow-y-scroll sft-fleet-scroll p-3 sm:p-4 space-y-2.5 pb-16">
              <div className="space-y-2.5 pb-12">
                {visibleItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        activateVehicleSuiviAndTracer(item.id, true);
                        setDeckOpen(false);
                      }}
                      className={`relative overflow-hidden rounded-2xl border p-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? "border-emerald-400/80 bg-emerald-500/15 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/50"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: item.statusColor }}
                            />
                            <span className="font-extrabold text-sm text-white truncate">{item.label}</span>
                          </div>
                          <p className="text-xs font-bold text-emerald-400 truncate pl-4.5">
                            {item.plateText} {item.city ? `• ${item.city}` : ""}
                          </p>
                        </div>
                        <span className={`${item.statusBadge} text-[10px] font-black shrink-0 rounded-full px-2 py-0.5 shadow-xs`}>
                          {item.statusLabel}
                        </span>
                      </div>

                      {/* Mini Telemetry Grid */}
                      <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-white/10 text-[11px] font-bold text-slate-300">
                        <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-xl border border-white/5">
                          <Gauge className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{Math.round(item.speed)} km/h</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-xl border border-white/5">
                          <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{formatAgo(item.last?.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-xl border border-white/5">
                          <Route className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{Math.round(item.distanceToday)} km</span>
                        </div>
                      </div>

                      {/* Battery & Fuel Levels */}
                      {(typeof item.battery === "number" || typeof item.fuel === "number") && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-1 border-t border-white/5">
                          {typeof item.battery === "number" && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                                <span className="flex items-center gap-1">
                                  <Battery className="h-3 w-3 text-emerald-400" /> Batterie
                                </span>
                                <span className="text-slate-200">{Math.round(item.battery)}%</span>
                              </div>
                              <Progress value={clamp(item.battery, 0, 100)} className="h-1 bg-white/10 [&>div]:bg-emerald-400" />
                            </div>
                          )}
                          {typeof item.fuel === "number" && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                                <span className="flex items-center gap-1">
                                  <Fuel className="h-3 w-3 text-amber-400" /> Carburant
                                </span>
                                <span className="text-slate-200">{Math.round(item.fuel)}%</span>
                              </div>
                              <Progress value={clamp(item.fuel, 0, 100)} className="h-1 bg-white/10 [&>div]:bg-amber-400" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            activateVehicleSuiviAndTracer(item.id, true);
                            setDeckOpen(false);
                          }}
                          className="flex-1 rounded-xl h-7 text-[11px] font-bold bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-400/35 flex items-center justify-center gap-1 transition-all"
                        >
                          <LocateFixed className="h-3 w-3 text-emerald-400" />
                          Suivi & Traceur
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(item.id);
                            void loadVehicleHistory(item.id, true);
                          }}
                          className="flex-1 rounded-xl h-7 text-[11px] font-bold bg-white/10 hover:bg-primary/30 text-white border border-white/15 flex items-center justify-center gap-1 transition-all"
                        >
                          <Play className="h-3 w-3 text-primary fill-current" />
                          Vidéo Trajet
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(item.id);
                            setActiveDeckTab("capteurs");
                          }}
                          className="rounded-xl h-7 px-2.5 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center transition-all"
                          title="Fiche capteurs"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {!visibleItems.length && (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <Car className="h-8 w-8 mx-auto opacity-30" />
                    <p className="font-bold text-xs">Aucun véhicule trouvé</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TABLEAU (High Density Grid) */}
          {activeDeckTab === "tableau" && (
            <div className="flex-1 min-h-0 overflow-y-scroll sft-fleet-scroll p-3 sm:p-4 space-y-3 pb-16">
              <div className="space-y-3 pb-12">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    {visibleItems.length} balises listées
                  </span>
                  <button
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
                    className="rounded-xl h-8 px-3 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center gap-1 transition-all"
                  >
                    <Download className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                    Exporter CSV
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 font-black text-[10px] text-slate-300 uppercase">
                        <th className="p-2.5">Véhicule</th>
                        <th className="p-2.5">Statut</th>
                        <th className="p-2.5">Vitesse</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 font-semibold">
                      {visibleItems.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => {
                            activateVehicleSuiviAndTracer(item.id, true);
                            setDeckOpen(false);
                          }}
                          className={`hover:bg-white/5 cursor-pointer transition-colors ${
                            item.id === selectedId ? "bg-emerald-500/15" : ""
                          }`}
                        >
                          <td className="p-2.5">
                            <div className="font-bold text-white truncate max-w-[130px]">{item.label}</div>
                            <div className="text-[10px] text-emerald-400 font-semibold">{item.plateText}</div>
                          </td>
                          <td className="p-2.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.statusBadge}`}>
                              {item.status === "moving" ? "Roulant" : item.status === "online" ? "Arrêt" : "Offline"}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-200">{Math.round(item.speed)} km/h</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                activateVehicleSuiviAndTracer(item.id, true);
                                setDeckOpen(false);
                              }}
                              className="h-7 w-7 rounded-lg bg-white/10 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all inline-flex"
                              title="Activer Suivi & Traceur"
                            >
                              <LocateFixed className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRAJETS (Advanced Historical Tracking Hub & Traceur Customization) */}
          {activeDeckTab === "trajet" && (
            <div className="flex-1 min-h-0 overflow-y-scroll sft-fleet-scroll p-3 sm:p-4 space-y-4 pb-16">
              <div className="space-y-4 pb-12">
                {/* Target Device Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider">
                    Véhicule sélectionné
                  </label>
                  <select
                    value={selectedId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedId(nextId);
                      if (nextId) {
                        activateVehicleSuiviAndTracer(nextId, false);
                      }
                    }}
                    className="w-full h-10 rounded-2xl bg-slate-900 border border-white/20 px-3 text-xs font-bold text-white focus:outline-hidden"
                  >
                    <option value="" className="bg-slate-900 text-white">Sélectionner un véhicule...</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id} className="bg-slate-900 text-white">
                        {i.label} ({i.plateText})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Presets */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider">
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
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setDatePreset(p.key as DatePreset)}
                        className={`rounded-xl h-8 text-[11px] font-bold transition-all ${
                          datePreset === p.key
                            ? "bg-primary text-white shadow-xs font-black"
                            : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                        } ${p.key === "custom" ? "col-span-2" : ""}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Pickers */}
                {datePreset === "custom" && (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400">Du</span>
                      <DatePicker value={customFrom} onChange={setCustomFrom} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400">Au</span>
                      <DatePicker
                        value={customTo}
                        onChange={(d) => {
                          if (d) {
                            const adjusted = new Date(d);
                            adjusted.setHours(23, 59, 59, 999);
                            setCustomTo(adjusted);
                          } else {
                            setCustomTo(undefined);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Load Route & Video Player Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void loadVehicleHistory(selectedId || items[0]?.id, false)}
                    disabled={isLoadingRoute}
                    className="rounded-2xl h-11 font-black text-xs bg-primary hover:bg-primary/90 text-white shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 px-3"
                  >
                    <Route className="h-4 w-4 mr-1.5 shrink-0" />
                    <span>{isLoadingRoute ? "Chargement..." : "Tracer le Trajet"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void loadVehicleHistory(selectedId || items[0]?.id, true)}
                    disabled={isLoadingRoute}
                    style={{ backgroundColor: tracerColor }}
                    className="rounded-2xl h-11 font-black text-xs text-slate-950 shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 px-3"
                  >
                    <Play className="h-4 w-4 mr-1.5 fill-current shrink-0" />
                    <span>Vidéo Trajectory Player</span>
                  </button>
                </div>

                {/* Inline Traceur Customization Box (Couleur & Taille du Traceur) */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: tracerColor }} />
                      Personnalisation Traceur (Couleur & Taille)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {tracerWeight}px • {tracerSize}px
                    </span>
                  </div>

                  {/* Color Swatches */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {TRACER_COLORS.map((c) => {
                      const active = tracerColor.toLowerCase() === c.value.toLowerCase();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTracerColor(c.value)}
                          className={`h-7 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition ${
                            active
                              ? "border-white bg-white/15 text-white scale-105"
                              : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-white/50"
                            style={{ backgroundColor: c.value }}
                          />
                          <span>{c.label}</span>
                        </button>
                      );
                    })}
                    <label className="h-7 px-2 rounded-xl border border-white/15 bg-white/5 text-[11px] font-bold text-slate-300 flex items-center gap-1 cursor-pointer">
                      <input
                        type="color"
                        value={tracerColor}
                        onChange={(e) => setTracerColor(e.target.value)}
                        className="h-4 w-4 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span>Couleur</span>
                    </label>
                  </div>

                  {/* Thickness & Icon Size Sliders */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-300">
                        <span>Épaisseur ligne</span>
                        <span style={{ color: tracerColor }}>{tracerWeight} px</span>
                      </div>
                      <Slider
                        value={[tracerWeight]}
                        min={2}
                        max={14}
                        step={1}
                        onValueChange={(v) => setTracerWeight(v[0] || 5)}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-300">
                        <span>Taille icône traceur</span>
                        <span style={{ color: tracerColor }}>{tracerSize} px</span>
                      </div>
                      <Slider
                        value={[tracerSize]}
                        min={24}
                        max={64}
                        step={2}
                        onValueChange={(v) => setTracerSize(v[0] || 38)}
                      />
                    </div>
                  </div>
                </div>

                {/* Route Analytics Cards */}
                {routePoints.length >= 2 && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-2xl bg-primary/20 border border-primary/30 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-primary">Distance</span>
                        <div className="text-xl font-black text-white">{routeStats.distanceKm} km</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-emerald-400">Durée</span>
                        <div className="text-xl font-black text-white">{routeStats.durationMin} min</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Vitesse Moyenne</span>
                        <div className="text-xl font-black text-white">{routeStats.avgSpeed} km/h</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Vitesse Max</span>
                        <div className="text-xl font-black text-white">{routeStats.maxSpeed} km/h</div>
                      </div>
                    </div>

                    {/* Detected Stops List */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span>Arrêts Détectés ({detectedStops.length})</span>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20">
                        {detectedStops.map((stop, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              if (mapRef.current) {
                                mapRef.current.flyTo([stop.lat, stop.lng], 16);
                                setDeckOpen(false);
                              }
                            }}
                            className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition cursor-pointer flex items-center justify-between text-xs text-white"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-black text-[10px] border border-red-400/30">
                                P
                              </span>
                              <div>
                                <span className="font-bold text-white">Arrêt #{i + 1}</span>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(stop.from).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(stop.to).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                            <span className="font-black text-red-400">
                              {stop.durationMin} min
                            </span>
                          </div>
                        ))}
                        {!detectedStops.length && (
                          <p className="text-xs text-slate-400 text-center py-2">Aucun arrêt prolongé</p>
                        )}
                      </div>
                    </div>

                    {/* Export Actions */}
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                        Exporter le trajet
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => exportRoute("csv")}
                          className="rounded-xl h-8 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center gap-1 transition-all"
                        >
                          <Download className="h-3 w-3 mr-1 text-emerald-400" />
                          CSV
                        </button>
                        <button
                          onClick={() => exportRoute("gpx")}
                          className="rounded-xl h-8 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center gap-1 transition-all"
                        >
                          <Download className="h-3 w-3 mr-1 text-sky-400" />
                          GPX
                        </button>
                        <button
                          onClick={() => exportRoute("txt")}
                          className="rounded-xl h-8 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center gap-1 transition-all"
                        >
                          <FileText className="h-3 w-3 mr-1 text-purple-400" />
                          Rapport
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CAPTEURS & DIAGNOSTIC */}
          {activeDeckTab === "capteurs" && (
            <div className="flex-1 min-h-0 overflow-y-scroll sft-fleet-scroll p-3 sm:p-4 space-y-4 pb-16">
              <div className="space-y-4 pb-12">
                {selectedItem ? (
                  <div className="space-y-4">
                    {/* Tachometer HUD Box */}
                    <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-5 text-center relative overflow-hidden">
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                        Vitesse Instantanée
                      </div>
                      <div className="text-5xl font-black tracking-tight text-white my-2 font-mono">
                        {Math.round(selectedItem.speed)}
                        <span className="text-sm font-semibold text-slate-400 ml-1">km/h</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold border border-white/15 text-white">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: selectedItem.statusColor }}
                        />
                        {selectedItem.statusLabel}
                      </div>
                    </div>

                    {/* Sensor Data Grid */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                      <div className="font-black text-xs uppercase tracking-wider text-slate-400">
                        Identité & Balise
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Véhicule</span>
                          <span className="font-bold text-white">{selectedItem.label}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Immatriculation</span>
                          <span className="font-bold text-emerald-400">{selectedItem.plateText}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">IMEI / ID Balise</span>
                          <span className="font-mono text-slate-300">{selectedItem.imei || selectedId}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Conducteur</span>
                          <span className="font-semibold text-white">{selectedItem.driver}</span>
                        </div>
                      </div>

                      <div className="h-px bg-white/10 my-2" />

                      <div className="font-black text-xs uppercase tracking-wider text-slate-400">
                        Télémétrie Aéro-Grade
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Coordonnées GPS</span>
                          <span className="font-mono text-xs text-slate-200">
                            {selectedItem.last ? `${selectedItem.last.lat.toFixed(5)}, ${selectedItem.last.lng.toFixed(5)}` : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Localisation Ville</span>
                          <span className="font-bold text-white">{selectedItem.city || "Maroc"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Distance du Jour</span>
                          <span className="font-black text-emerald-400">{Math.round(selectedItem.distanceToday)} km</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Dernier Rapport</span>
                          <span className="font-semibold text-slate-300">{formatAgo(selectedItem.last?.timestamp)}</span>
                        </div>
                      </div>

                      {/* Gauges */}
                      <div className="space-y-3 pt-2">
                        {typeof selectedItem.fuel === "number" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <span className="flex items-center gap-1.5 text-amber-400">
                                <Fuel className="h-4 w-4" /> Niveau Réservoir
                              </span>
                              <span>{Math.round(selectedItem.fuel)}%</span>
                            </div>
                            <Progress value={clamp(selectedItem.fuel, 0, 100)} className="h-2 bg-white/10 [&>div]:bg-amber-400" />
                          </div>
                        )}

                        {typeof selectedItem.battery === "number" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <span className="flex items-center gap-1.5 text-emerald-400">
                                <Battery className="h-4 w-4" /> Tension Batterie
                              </span>
                              <span>{Math.round(selectedItem.battery)}%</span>
                            </div>
                            <Progress value={clamp(selectedItem.battery, 0, 100)} className="h-2 bg-white/10 [&>div]:bg-emerald-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Google Maps External Links */}
                    {selectedItem.last && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${selectedItem.last!.lat},${selectedItem.last!.lng}`,
                              "_blank"
                            );
                          }}
                          className="rounded-2xl h-10 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center transition-all"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1 text-blue-400" />
                          Google Maps ↗
                        </button>
                        <button
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedItem.last!.lat},${selectedItem.last!.lng}`,
                              "_blank"
                            );
                          }}
                          className="rounded-2xl h-10 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center transition-all"
                        >
                          <Navigation className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                          Street View ↗
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setActiveDeckTab("trajet");
                        loadVehicleHistory(selectedItem.id);
                      }}
                      className="w-full rounded-2xl h-10 font-bold bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-all"
                    >
                      <Route className="h-4 w-4 mr-2" />
                      Voir les trajets de ce véhicule
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 space-y-2">
                    <SlidersHorizontal className="h-8 w-8 mx-auto opacity-30" />
                    <p className="font-bold text-xs">Sélectionnez un véhicule pour afficher son diagnostic</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Bottom Quick Scroll & Fleet Status Bar */}
          <div className="shrink-0 px-4 py-2 bg-slate-950/85 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Car className="h-3.5 w-3.5 text-emerald-400" />
              <span>{visibleItems.length} véhicules au parc</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const el = document.querySelector('.sft-fleet-scroll');
                  if (el) el.scrollBy({ top: -240, behavior: 'smooth' });
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                title="Défiler vers le haut"
              >
                <ChevronUp className="h-3 w-3" /> Haut
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.querySelector('.sft-fleet-scroll');
                  if (el) el.scrollBy({ top: 240, behavior: 'smooth' });
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-400/30 transition flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                title="Défiler vers le bas"
              >
                <ChevronDown className="h-3 w-3" /> Bas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
  );
}
