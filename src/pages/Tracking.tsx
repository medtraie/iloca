import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "@/components/ui/sonner";
import { useGPSwoxVehiclesOnly, GPSwoxDevice } from "@/hooks/useGPSwoxVehiclesOnly";
import { gpswoxService } from "@/services/gpswoxService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
  Play,
  RefreshCw,
  Search,
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
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  TimerReset,
  Plus,
  Minus,
  X,
  Target
} from "lucide-react";

type HistoryPoint = { lat: number; lng: number; timestamp: number; speed?: number };

type MapTheme =
  | "google_roadmap"
  | "google_hybrid"
  | "google_traffic"
  | "google_satellite"
  | "google_terrain"
  | "dark"
  | "osm";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

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
  google_roadmap: {
    label: "Google Maps Routier",
    description: "Plan officiel Google standard Maroc",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=fr&gl=MA",
    attribution: "&copy; Google Maps",
    maxZoom: 21,
    subdomains: ["0", "1", "2", "3"],
    isGoogle: true,
    badge: "Google"
  },
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
    description: "Topographie et relief physique",
    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=fr&gl=MA",
    attribution: "&copy; Google Maps",
    maxZoom: 21,
    subdomains: ["0", "1", "2", "3"],
    isGoogle: true,
    badge: "Google"
  },
  dark: {
    label: "Cyber Dark 2026",
    description: "Mode sombre haute lisibilité",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20
  },
  osm: {
    label: "OpenStreetMap",
    description: "Cartographie collaborative",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }
};

const formatAgo = (timestamp: number | undefined) => {
  if (!timestamp || !Number.isFinite(timestamp)) return "—";
  const diffMs = Date.now() - timestamp;
  const s = Math.max(0, Math.floor(diffMs / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}j`;
};

const toIsoRange = (from: Date | undefined, to: Date | undefined) => {
  const f = from ? new Date(from) : new Date(Date.now() - 24 * 3600 * 1000);
  const t = to ? new Date(to) : new Date();
  if (t.getHours() === 0 && t.getMinutes() === 0 && t.getSeconds() === 0) {
    t.setHours(23, 59, 59, 999);
  }
  return { fromIso: f.toISOString(), toIso: t.toISOString() };
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

// 2026 High-Tech Vehicle Marker
function buildModernVehicleMarker(item: {
  status: "online" | "moving" | "offline";
  speed: number;
  label: string;
  plate: string;
  selected: boolean;
}) {
  const isMoving = item.status === "moving";
  const isOnline = item.status === "online";
  const statusColor = isMoving ? "#10b981" : isOnline ? "#f59e0b" : "#f43f5e";
  const speedText = isMoving ? `${Math.round(item.speed)} km/h` : isOnline ? "Arrêt" : "Hors ligne";
  const shortLabel = (item.plate || item.label || "SFT").slice(0, 14);

  const glow = isMoving
    ? "rgba(16, 185, 129, 0.75)"
    : isOnline
    ? "rgba(245, 158, 11, 0.65)"
    : "rgba(244, 63, 94, 0.4)";

  const pulseAnimation = isMoving
    ? `<div style="position:absolute; inset:-8px; border-radius:9999px; background:${glow}; opacity:0.35; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
    : "";

  const selectionHalo = item.selected
    ? `<div style="position:absolute; inset:-12px; border-radius:9999px; border:2.5px solid #38bdf8; animation: pulse 1.5s infinite; box-shadow:0 0 18px #38bdf8;"></div>`
    : "";

  const html = `
    <div style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:pointer; user-select:none;">
      <div style="position:relative; width:${item.selected ? 42 : 36}px; height:${item.selected ? 42 : 36}px; display:flex; align-items:center; justify-content:center;">
        ${selectionHalo}
        ${pulseAnimation}
        
        <div style="
          width:100%;
          height:100%;
          border-radius:9999px;
          background: linear-gradient(135deg, ${statusColor} 0%, rgba(15,23,42,0.95) 100%);
          border: ${item.selected ? "3px solid #ffffff" : "2px solid rgba(255,255,255,0.85)"};
          box-shadow: 0 8px 20px rgba(0,0,0,0.45), 0 0 14px ${glow};
          display:flex;
          align-items:center;
          justify-content:center;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        ">
          <svg width="${item.selected ? 20 : 16}" height="${item.selected ? 20 : 16}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>

        <div style="
          position:absolute;
          top:-2px;
          right:-2px;
          width:10px;
          height:10px;
          border-radius:9999px;
          background:${statusColor};
          border:1.5px solid #ffffff;
          box-shadow:0 0 6px ${statusColor};
        "></div>
      </div>

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
          color: ${isMoving ? "#34d399" : isOnline ? "#fbbf24" : "#f43f5e"};
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

function buildFlagMarker(type: "start" | "end") {
  const isStart = type === "start";
  const bg = isStart ? "#10b981" : "#8b5cf6";
  const label = isStart ? "Départ" : "Arrivée";
  const html = `
    <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">
      <div style="
        padding:3px 8px;
        border-radius:9999px;
        background:${bg};
        color:#ffffff;
        font:800 10px/1.2 system-ui;
        box-shadow:0 6px 16px rgba(0,0,0,0.4);
        border:1.5px solid #ffffff;
        display:flex;
        align-items:center;
        gap:4px;
      ">
        <span>${isStart ? "🏁" : "🎯"}</span>
        <span>${label}</span>
      </div>
      <div style="width:2px; height:8px; background:${bg};"></div>
    </div>
  `;
  return L.divIcon({ className: "custom-flag-marker", html, iconSize: [80, 40], iconAnchor: [40, 40] });
}

function buildStopMarker(durationMin: number, idx: number) {
  const html = `
    <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%); cursor:pointer;">
      <div style="
        padding:3px 7px;
        border-radius:9999px;
        background:#f59e0b;
        color:#0f172a;
        font:900 10px/1.2 system-ui;
        box-shadow:0 6px 14px rgba(245,158,11,0.5);
        border:2px solid #ffffff;
        display:flex;
        align-items:center;
        gap:3px;
        white-space:nowrap;
      ">
        <span>⏱️</span>
        <span>Arrêt #${idx} (${durationMin}m)</span>
      </div>
      <div style="width:2px; height:7px; background:#f59e0b;"></div>
    </div>
  `;
  return L.divIcon({ className: "custom-stop-marker", html, iconSize: [100, 36], iconAnchor: [50, 36] });
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

function buildPlaybackTraceMarker(opts: {
  color: string;
  size: number;
  speed: number;
  label?: string;
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
  return L.divIcon({ className: "custom-trace-marker", html, iconSize: [size, size], iconAnchor: [0, 0] });
}

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

const toCsv = (_deviceLabel: string, points: HistoryPoint[]) => {
  const header = "timestamp,lat,lng,speed_kmh,iso_time";
  const rows = points.map(
    (p) => `${p.timestamp},${p.lat.toFixed(6)},${p.lng.toFixed(6)},${Math.round(Number(p.speed || 0))},${new Date(p.timestamp).toISOString()}`
  );
  return [header, ...rows].join("\n");
};

const buildReport = (deviceLabel: string, points: HistoryPoint[]) => {
  const stats = computeRouteStats(points);
  const stops = detectStops(points);
  const start = points[0] ? new Date(points[0].timestamp).toLocaleString() : "—";
  const end = points.length ? new Date(points[points.length - 1].timestamp).toLocaleString() : "—";
  const lines: string[] = [];
  lines.push(`RAPPORT TRAJET SFT TRACKING — ${deviceLabel}`);
  lines.push("=".repeat(50));
  lines.push(`Période d'analyse : ${start} → ${end}`);
  lines.push(`Points GPS enregistrés : ${points.length}`);
  lines.push(`Distance totale : ${stats.distanceKm} km`);
  lines.push(`Durée totale du trajet : ${stats.durationMin} min`);
  lines.push(`Vitesse moyenne : ${stats.avgSpeed} km/h`);
  lines.push(`Vitesse maximale : ${stats.maxSpeed} km/h`);
  lines.push(`Arrêts détectés : ${stops.length}`);
  lines.push("");
  if (stops.length) {
    lines.push("Détail des arrêts détectés :");
    stops.forEach((s, idx) => {
      lines.push(
        `  #${idx + 1} | Durée: ${s.durationMin} min | De: ${new Date(s.from).toLocaleTimeString()} À: ${new Date(s.to).toLocaleTimeString()} | Coordonnées: ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`
      );
    });
  }
  return lines.join("\n");
};

export default function Tracking() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const routeGlowLineRef = useRef<L.Polyline | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const traceLineRef = useRef<L.Polyline | null>(null);
  const traceMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const vehicleMarkersRef = useRef<L.Marker[]>([]);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const geofenceMarkerRef = useRef<L.Marker | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const liveTimerRef = useRef<number | null>(null);
  const playbackIndexRef = useRef(0);
  const geofenceInsideRef = useRef<boolean | null>(null);
  const drawGeofenceRef = useRef(false);

  // States
  const [vehicleId, setVehicleId] = useState("");
  const [gpsDevices, setGpsDevices] = useState<GPSwoxDevice[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "moving" | "online" | "offline">("all");
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date(Date.now() - 24 * 3600 * 1000));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [datePreset, setDatePreset] = useState<"1h" | "today" | "24h" | "7d" | "custom">("24h");
  const [mapTheme, setMapTheme] = useState<MapTheme>("google_roadmap");
  const [layersModalOpen, setLayersModalOpen] = useState(false);
  const [tracerModalOpen, setTracerModalOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  const [activeDeckTab, setActiveDeckTab] = useState<"vehicules" | "trajet" | "geofence" | "rapport">("vehicules");
  const [follow, setFollow] = useState(true);
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(160);
  const [liveMode, setLiveMode] = useState(false);
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [geofenceRadiusM, setGeofenceRadiusM] = useState(400);
  const [drawGeofence, setDrawGeofence] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  useEffect(() => {
    drawGeofenceRef.current = drawGeofence;
  }, [drawGeofence]);

  // Auto fetch devices from hook
  const { data: vehiclesFromGps = [] } = useGPSwoxVehiclesOnly(60000);

  useEffect(() => {
    if (vehiclesFromGps.length) {
      setGpsDevices(vehiclesFromGps);
      if (!vehicleId) {
        setVehicleId(String(vehiclesFromGps[0].id));
      }
    }
  }, [vehiclesFromGps, vehicleId]);

  const selectedDevice = useMemo(() => {
    if (!vehicleId) return gpsDevices[0] || null;
    return gpsDevices.find((d) => String(d.id) === String(vehicleId)) || gpsDevices[0] || null;
  }, [vehicleId, gpsDevices]);

  const deviceLabel = useMemo(() => {
    if (!selectedDevice) return "Véhicule SFT";
    return selectedDevice.plate || selectedDevice.name || selectedDevice.imei || selectedDevice.id;
  }, [selectedDevice]);

  // Filtered devices list
  const filteredDevices = useMemo(() => {
    let list = gpsDevices;
    if (filter === "moving") list = list.filter((d) => d.online && d.speed > 1);
    else if (filter === "online") list = list.filter((d) => d.online && d.speed <= 1);
    else if (filter === "offline") list = list.filter((d) => !d.online);

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => {
      return (
        d.name?.toLowerCase().includes(q) ||
        d.plate?.toLowerCase().includes(q) ||
        d.imei?.toLowerCase().includes(q) ||
        d.id?.toLowerCase().includes(q)
      );
    });
  }, [gpsDevices, filter, search]);

  const stats = useMemo(() => computeRouteStats(points), [points]);
  const detectedStops = useMemo(() => detectStops(points), [points]);
  const lastPoint = points.length ? points[points.length - 1] : null;

  // Fleet overview statistics
  const fleetStats = useMemo(() => {
    const total = gpsDevices.length;
    const moving = gpsDevices.filter((d) => d.online && d.speed > 1).length;
    const online = gpsDevices.filter((d) => d.online && d.speed <= 1).length;
    const offline = gpsDevices.filter((d) => !d.online).length;
    return { total, moving, online, offline };
  }, [gpsDevices]);

  // Synchronize GPS devices with API
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
        drawVehicleMarkers(mapped);
        toast.success(`${mapped.length} véhicules SFT synchronisés`);
      } else {
        toast.error("Aucun véhicule SFT trouvé");
      }
    } catch {
      toast.error("Échec de synchronisation SFT");
    } finally {
      setSyncing(false);
    }
  };

  // Ensure map is initialized once
  const ensureMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const center: L.LatLngExpression = [33.5731, -7.5898];
    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

    const theme = tileCatalog[mapTheme];
    const tile = L.tileLayer(theme.url, {
      attribution: theme.attribution,
      maxZoom: theme.maxZoom,
      subdomains: theme.subdomains || ["a", "b", "c"]
    }).addTo(map);

    const overlay = L.layerGroup().addTo(map);
    mapRef.current = map;
    tileRef.current = tile;
    overlayLayerRef.current = overlay;

    map.on("click", (e) => {
      if (!drawGeofenceRef.current) return;
      setGeofenceCircle({ lat: e.latlng.lat, lng: e.latlng.lng });
      toast.success("Zone géofence définie sur la carte");
      setDrawGeofence(false);
    });
  }, []);

  // Switch Google Maps & Other Themes
  const setTileTheme = (theme: MapTheme) => {
    setMapTheme(theme);
    const map = mapRef.current;
    if (!map) return;
    const old = tileRef.current;
    if (old) old.remove();
    const next = tileCatalog[theme];
    const tile = L.tileLayer(next.url, {
      attribution: next.attribution,
      maxZoom: next.maxZoom,
      subdomains: next.subdomains || ["a", "b", "c"]
    });
    tile.addTo(map);
    tileRef.current = tile;
  };

  // Clear Overlays
  const clearOverlays = () => {
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

  const clearVehicleMarkers = () => {
    vehicleMarkersRef.current.forEach((m) => m.remove());
    vehicleMarkersRef.current = [];
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

  const fitToRoute = (targetPts?: HistoryPoint[]) => {
    const map = mapRef.current;
    const list = targetPts || points;
    if (!map || list.length < 2) return;
    const coords = list.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(L.latLngBounds(coords), { padding: [45, 45], maxZoom: 16 });
  };

  const centerOnActive = () => {
    const map = mapRef.current;
    if (!map) return;
    if (points.length && points[playbackIndex]) {
      const p = points[playbackIndex];
      map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
    } else if (selectedDevice && Number.isFinite(selectedDevice.lat) && Number.isFinite(selectedDevice.lng)) {
      map.flyTo([selectedDevice.lat, selectedDevice.lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
    }
  };

  // Draw Route Polylines, Custom Traceur Beacon, and Pins
  const drawRoute = useCallback(
    (input: HistoryPoint[], fitBounds = true) => {
      const map = mapRef.current;
      const overlay = overlayLayerRef.current;
      if (!map || !overlay) return;

      clearOverlays();
      if (input.length < 2) return;
      const coords = input.map((p) => [p.lat, p.lng] as [number, number]);

      if (tracerGlow) {
        routeGlowLineRef.current = L.polyline(coords, {
          color: tracerColor,
          weight: tracerWeight * 2.4,
          opacity: 0.28,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(overlay);
      }

      // Main Customizable Route Line
      routeLineRef.current = L.polyline(coords, {
        color: tracerColor,
        weight: tracerWeight,
        opacity: 0.94,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(overlay);

      startMarkerRef.current = L.marker(coords[0], {
        icon: buildFlagMarker("start"),
        zIndexOffset: 800
      }).addTo(overlay);

      endMarkerRef.current = L.marker(coords[coords.length - 1], {
        icon: buildFlagMarker("end"),
        zIndexOffset: 900
      }).addTo(overlay);

      // Always show the Custom Traceur Marker at active playback point
      const curIdx = clamp(playbackIndexRef.current, 0, input.length - 1);
      const curPt = input[curIdx] || input[input.length - 1];
      traceMarkerRef.current = L.marker([curPt.lat, curPt.lng], {
        icon: buildPlaybackTraceMarker({
          color: tracerColor,
          size: tracerSize,
          speed: curPt.speed || 0,
          label: deviceLabel,
          glow: tracerGlow
        }),
        zIndexOffset: 1350
      }).addTo(overlay);

      const stops = detectStops(input);
      stops.forEach((s, idx) => {
        const m = L.marker([s.lat, s.lng], {
          icon: buildStopMarker(s.durationMin, idx + 1),
          zIndexOffset: 750
        }).addTo(overlay);
        m.bindPopup(`
          <div style="font-family:system-ui; padding:4px 6px;">
            <div style="font-weight:900; font-size:12px; color:#f59e0b; margin-bottom:4px;">Arrêt #${idx + 1} (${s.durationMin} min)</div>
            <div style="font-size:11px; color:#64748b;">De: <b>${new Date(s.from).toLocaleTimeString()}</b></div>
            <div style="font-size:11px; color:#64748b;">À: <b>${new Date(s.to).toLocaleTimeString()}</b></div>
            <div style="font-size:10px; color:#94a3b8; margin-top:3px; font-family:monospace;">${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}</div>
          </div>
        `);
        stopMarkersRef.current.push(m);
      });

      if (fitBounds) {
        fitToRoute(input);
      }
    },
    [tracerColor, tracerWeight, tracerSize, tracerGlow, deviceLabel]
  );

  // Dynamically re-render route & traceur when user customizes color/size/glow
  useEffect(() => {
    if (points.length >= 2) {
      drawRoute(points, false);
    }
  }, [tracerColor, tracerWeight, tracerSize, tracerGlow, points, drawRoute]);

  // Geofence Circle Overlay
  const setGeofenceCircle = (center: { lat: number; lng: number }) => {
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;
    if (geofenceCircleRef.current) geofenceCircleRef.current.remove();
    if (geofenceMarkerRef.current) geofenceMarkerRef.current.remove();

    geofenceCircleRef.current = L.circle([center.lat, center.lng], {
      radius: geofenceRadiusM,
      color: "#ef4444",
      weight: 2.5,
      opacity: 0.95,
      fillColor: "#ef4444",
      fillOpacity: 0.12,
      dashArray: "6, 6"
    }).addTo(overlay);

    geofenceMarkerRef.current = L.marker([center.lat, center.lng], {
      icon: L.divIcon({
        className: "geofence-center-pin",
        html: `<div style="width:14px; height:14px; border-radius:9999px; background:#ef4444; border:2.5px solid #ffffff; box-shadow:0 0 10px #ef4444; transform:translate(-50%, -50%);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      }),
      zIndexOffset: 950
    }).addTo(overlay);

    geofenceInsideRef.current = null;
  };

  const setGeofenceAtCenter = () => {
    ensureMap();
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setGeofenceCircle({ lat: c.lat, lng: c.lng });
    toast.success("Zone géofence centrée sur la carte");
  };

  const setGeofenceOnVehicle = () => {
    if (!selectedDevice || !Number.isFinite(selectedDevice.lat) || !Number.isFinite(selectedDevice.lng)) {
      toast.error("Aucun véhicule sélectionné");
      return;
    }
    setGeofenceCircle({ lat: selectedDevice.lat, lng: selectedDevice.lng });
    toast.success(`Zone géofence placée sur ${deviceLabel}`);
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

  // Draw Vehicle Markers
  const drawVehicleMarkers = (devices: GPSwoxDevice[]) => {
    const overlay = overlayLayerRef.current;
    if (!overlay) return;
    clearVehicleMarkers();
    const usable = devices.filter(
      (device) =>
        Number.isFinite(device.lat) &&
        Number.isFinite(device.lng) &&
        (device.lat !== 0 || device.lng !== 0)
    );
    usable.forEach((device) => {
      const isSelected = selectedDevice ? String(selectedDevice.id) === String(device.id) : false;
      const status: "online" | "moving" | "offline" = device.online
        ? device.speed > 1
          ? "moving"
          : "online"
        : "offline";

      const marker = L.marker([device.lat, device.lng], {
        icon: buildModernVehicleMarker({
          status,
          speed: device.speed,
          label: device.name,
          plate: device.plate,
          selected: isSelected
        }),
        zIndexOffset: isSelected ? 1200 : 500
      }).addTo(overlay);

      marker.on("click", () => {
        setVehicleId(String(device.id));
        void loadHistory(String(device.id), false);
      });

      marker.bindPopup(`
        <div style="font-family:system-ui; padding:4px 6px; min-width:180px;">
          <div style="font-weight:900; font-size:13px; color:#0f172a; margin-bottom:2px;">${device.plate || device.name}</div>
          <div style="font-size:11px; color:#64748b; margin-bottom:6px;">${device.name || "Véhicule SFT"}</div>
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px;">
            <span style="color:#64748b;">Statut:</span>
            <b style="color:${status === "moving" ? "#10b981" : status === "online" ? "#f59e0b" : "#f43f5e"};">${status === "moving" ? "En mouvement" : status === "online" ? "Arrêt" : "Hors ligne"}</b>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px;">
            <span style="color:#64748b;">Vitesse:</span>
            <b>${Math.round(device.speed)} km/h</b>
          </div>
          <div style="font-size:10px; color:#94a3b8; font-family:monospace; margin-top:4px;">${device.lat.toFixed(5)}, ${device.lng.toFixed(5)}</div>
        </div>
      `);
      vehicleMarkersRef.current.push(marker);
    });
  };

  // Start playback on a given array of points
  const startPlaybackWithPoints = (ptsToPlay: HistoryPoint[]) => {
    ensureMap();
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    const activePts = ptsToPlay.length >= 2 ? ptsToPlay : points;
    if (!map || !overlay || activePts.length < 2) return;

    stopLive();
    stopPlayback();
    setIsPlaying(true);
    setDeckOpen(false);

    if (playbackIndexRef.current >= activePts.length - 1) {
      playbackIndexRef.current = 0;
      setPlaybackIndex(0);
    }

    const start = activePts[playbackIndexRef.current];
    const startIcon = buildPlaybackTraceMarker({
      color: tracerColor,
      size: tracerSize,
      speed: start.speed || 0,
      label: deviceLabel,
      glow: tracerGlow
    });

    if (!traceMarkerRef.current) {
      traceMarkerRef.current = L.marker([start.lat, start.lng], {
        icon: startIcon,
        zIndexOffset: 1350
      }).addTo(overlay);
    } else {
      traceMarkerRef.current.setLatLng([start.lat, start.lng]);
      traceMarkerRef.current.setIcon(startIcon);
      traceMarkerRef.current.addTo(overlay);
    }

    if (!traceLineRef.current) {
      traceLineRef.current = L.polyline([[start.lat, start.lng]], {
        color: "#ffffff",
        weight: Math.max(3, tracerWeight - 1),
        opacity: 0.95,
        lineCap: "round"
      }).addTo(overlay);
    } else {
      traceLineRef.current.setLatLngs([[start.lat, start.lng]]);
      traceLineRef.current.addTo(overlay);
    }

    map.panTo([start.lat, start.lng], { animate: true, duration: 0.3 });

    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    playbackTimerRef.current = window.setInterval(() => {
      if (playbackIndexRef.current >= activePts.length - 1) {
        stopPlayback();
        toast.success("Lecture vidéo terminée");
        return;
      }
      playbackIndexRef.current += 1;
      const curIdx = playbackIndexRef.current;
      setPlaybackIndex(curIdx);
      const p = activePts[curIdx];
      const latlng: [number, number] = [p.lat, p.lng];
      const stepIcon = buildPlaybackTraceMarker({
        color: tracerColor,
        size: tracerSize,
        speed: p.speed || 0,
        label: deviceLabel,
        glow: tracerGlow
      });
      if (traceMarkerRef.current) {
        traceMarkerRef.current.setLatLng(latlng);
        traceMarkerRef.current.setIcon(stepIcon);
      }
      if (traceLineRef.current) {
        const nextCoords = activePts.slice(0, curIdx + 1).map((x) => [x.lat, x.lng] as [number, number]);
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
          toast(inside ? "🛡️ Entrée dans la zone géofence" : "⚠️ Sortie de la zone géofence", {
            description: deviceLabel
          });
        }
      }
    }, clamp(playSpeedMs, 60, 600));
  };

  // Load Device Trip History
  const loadHistory = async (targetId?: string, autoPlayAfterLoad = false) => {
    ensureMap();
    stopPlayback();
    stopLive();

    const devId = targetId || selectedDevice?.id || gpsDevices[0]?.id;
    if (!devId) {
      toast.error("Choisissez un véhicule SFT");
      return;
    }
    if (String(devId) !== String(vehicleId)) {
      setVehicleId(String(devId));
    }

    const targetDev = gpsDevices.find((d) => String(d.id) === String(devId)) || selectedDevice;

    try {
      setLoadingHistory(true);
      const { fromIso, toIso } = toIsoRange(fromDate, toDate);
      const history = await gpswoxService.getDeviceHistory(String(devId), fromIso, toIso, targetDev);
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
      setPlaybackIndex(0);
      playbackIndexRef.current = 0;
      geofenceInsideRef.current = null;

      if (!normalized.length || normalized.length < 2) {
        if (targetDev && Number.isFinite(targetDev.lat) && Number.isFinite(targetDev.lng) && (targetDev.lat !== 0 || targetDev.lng !== 0)) {
          mapRef.current?.flyTo([targetDev.lat, targetDev.lng], 16, { duration: 0.6 });
          toast.info("Le véhicule est resté stationné (position actuelle affichée).");
        } else {
          toast.info("Aucun trajet enregistré sur ce créneau horaire.");
        }
        clearOverlays();
        drawVehicleMarkers(filteredDevices);
        return;
      }

      drawRoute(normalized, true);
      setDeckOpen(false);
      toast.success(`Trajet chargé avec succès (${normalized.length} points)`, {
        description: `Distance: ${computeRouteStats(normalized).distanceKm} km • Arrêts: ${detectStops(normalized).length}`
      });

      if (autoPlayAfterLoad) {
        setTimeout(() => startPlaybackWithPoints(normalized), 150);
      }
    } catch (err: any) {
      console.error("Tracking loadHistory error:", err);
      toast.error("Impossible de récupérer l'historique GPS", {
        description: err?.message || "Erreur de connexion"
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // Quick Preset Date Range
  const applyDatePreset = (preset: "1h" | "today" | "24h" | "7d") => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === "1h") {
      setFromDate(new Date(now.getTime() - 3600 * 1000));
      setToDate(now);
    } else if (preset === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      setFromDate(todayStart);
      setToDate(todayEnd);
    } else if (preset === "24h") {
      setFromDate(new Date(now.getTime() - 24 * 3600 * 1000));
      setToDate(now);
    } else if (preset === "7d") {
      setFromDate(new Date(now.getTime() - 7 * 24 * 3600 * 1000));
      setToDate(now);
    }
  };

  // Seek / Scrub directly to a point in route
  const seekToPoint = (index: number) => {
    if (!points.length || index < 0 || index >= points.length) return;
    playbackIndexRef.current = index;
    setPlaybackIndex(index);
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;

    const p = points[index];
    const latlng: [number, number] = [p.lat, p.lng];

    const stepIcon = buildPlaybackTraceMarker({
      color: tracerColor,
      size: tracerSize,
      speed: p.speed || 0,
      label: deviceLabel,
      glow: tracerGlow
    });

    if (!traceMarkerRef.current) {
      traceMarkerRef.current = L.marker(latlng, {
        icon: stepIcon,
        zIndexOffset: 1350
      }).addTo(overlay);
    } else {
      traceMarkerRef.current.setLatLng(latlng);
      traceMarkerRef.current.setIcon(stepIcon);
      traceMarkerRef.current.addTo(overlay);
    }

    if (!traceLineRef.current) {
      traceLineRef.current = L.polyline([latlng], {
        color: "#ffffff",
        weight: Math.max(3, tracerWeight - 1),
        opacity: 0.95,
        lineCap: "round"
      }).addTo(overlay);
    } else {
      const nextCoords = points.slice(0, index + 1).map((x) => [x.lat, x.lng] as [number, number]);
      traceLineRef.current.setLatLngs(nextCoords);
    }

    if (follow) map.panTo(latlng, { animate: true, duration: 0.2 });
  };

  // Toggle Video Playback
  const togglePlayback = () => {
    ensureMap();
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (points.length < 2) {
      void loadHistory(selectedDevice?.id, true);
      return;
    }
    startPlaybackWithPoints(points);
  };

  const replay = () => {
    playbackIndexRef.current = 0;
    setPlaybackIndex(0);
    stopPlayback();
    if (points.length >= 2) {
      clearOverlays();
      drawRoute(points, false);
      startPlaybackWithPoints(points);
    } else {
      void loadHistory(selectedDevice?.id, true);
    }
  };

  // Real-time Live Tracking Mode (polls every 8s)
  const startLive = async () => {
    ensureMap();
    stopPlayback();

    if (!selectedDevice) {
      toast.error("Choisissez un véhicule SFT");
      return;
    }

    setLiveMode(true);
    if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    liveTimerRef.current = window.setInterval(async () => {
      try {
        const devices = await gpswoxService.getDevices();
        setGpsDevices(devices.map((item, _idx, arr) => arr.find((x) => x.id === item.id) || item) as any);
        const device =
          devices.find((d) => d.id === selectedDevice.id) ||
          devices.find((d) => d.plate === selectedDevice.plate) ||
          null;
        if (!device || !device.lat || !device.lng) return;
        const next: HistoryPoint = {
          lat: device.lat,
          lng: device.lng,
          timestamp: Date.now(),
          speed: device.speed
        };
        setPoints((prev) => {
          const last = prev.length ? prev[prev.length - 1] : null;
          if (last && Math.abs(last.lat - next.lat) < 0.000001 && Math.abs(last.lng - next.lng) < 0.000001) {
            return prev;
          }
          const updated = [...prev, next];
          drawRoute(updated, false);
          if (follow && mapRef.current) {
            mapRef.current.panTo([next.lat, next.lng], { animate: true, duration: 0.25 });
          }
          return updated;
        });
      } catch {
        // silent sync retry
      }
    }, 8000);
    toast.success("Mode Direct Live activé (~8s)");
  };

  // Lifecycle Map Init & Cleanup
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
      routeGlowLineRef.current = null;
      routeLineRef.current = null;
      traceLineRef.current = null;
      traceMarkerRef.current = null;
      endMarkerRef.current = null;
      startMarkerRef.current = null;
      geofenceCircleRef.current = null;
      geofenceMarkerRef.current = null;
      stopMarkersRef.current = [];
      vehicleMarkersRef.current = [];
    };
  }, [ensureMap]);

  useEffect(() => {
    if (!mapRef.current) return;
    setTileTheme(mapTheme);
  }, [mapTheme]);

  useEffect(() => {
    applyGeofenceVisibility(geofenceEnabled);
    if (geofenceCircleRef.current) geofenceCircleRef.current.setRadius(geofenceRadiusM);
  }, [geofenceEnabled, geofenceRadiusM]);

  useEffect(() => {
    ensureMap();
    drawVehicleMarkers(filteredDevices);
  }, [filteredDevices, selectedDevice?.id, ensureMap]);

  // Automatically center or populate live trajectory when selectedDevice changes
  useEffect(() => {
    if (!selectedDevice) return;
    stopPlayback();
    stopLive();
    const raw = selectedDevice.raw || selectedDevice;
    const hasTrail =
      (Array.isArray(raw?.tail) && raw.tail.length >= 2) ||
      (typeof raw?.latest_positions === "string" && raw.latest_positions.includes(";")) ||
      (typeof raw?.traccar?.latest_positions === "string" && raw.traccar.latest_positions.includes(";"));
    if (hasTrail) {
      const instantPts = gpswoxService.parseDevicePositions(selectedDevice);
      if (instantPts.length >= 2) {
        setPoints(instantPts);
        playbackIndexRef.current = 0;
        setPlaybackIndex(0);
        drawRoute(instantPts, true);
        return;
      }
    }
    if (
      mapRef.current &&
      Number.isFinite(selectedDevice.lat) &&
      Number.isFinite(selectedDevice.lng) &&
      (selectedDevice.lat !== 0 || selectedDevice.lng !== 0)
    ) {
      mapRef.current.flyTo([selectedDevice.lat, selectedDevice.lng], Math.max(mapRef.current.getZoom(), 14), {
        duration: 0.6
      });
    }
  }, [selectedDevice?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(timer);
  }, [deckOpen, activeDeckTab]);

  // Handle file export
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
    toast.success(`Export ${format.toUpperCase()} téléchargé avec succès`);
  };

  const activePlaybackPoint = points[playbackIndex] || lastPoint;

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)] max-h-screen overflow-hidden bg-background rounded-3xl border border-border/40 shadow-2xl">
      {/* 2026 FLOATING TOP COMMAND HUD */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Brand Telemetry & Active Status Capsule (Transparent Frosted Glass) */}
        <div className="flex items-center gap-2 bg-slate-900/45 dark:bg-slate-950/50 backdrop-blur-2xl border border-white/20 rounded-full p-1.5 px-3.5 shadow-xl pointer-events-auto transition-all text-white">
          <div className="flex items-center gap-2 pr-2.5 border-r border-white/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-black tracking-wider text-white uppercase hidden sm:inline">
              SFT <span className="text-cyan-400">TRACKING</span>
            </span>
          </div>

          {/* Active Vehicle Capsule */}
          {selectedDevice ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-xs font-bold text-white border border-white/15">
              <Car className="h-3.5 w-3.5 text-cyan-400" />
              <span>{selectedDevice.plate || selectedDevice.name}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-300 font-semibold hidden md:inline">
              Sélectionnez un véhicule pour tracer
            </span>
          )}

          {/* Key Metrics Pills */}
          {points.length >= 2 && (
            <div className="hidden lg:flex items-center gap-1 pl-1 text-[11px] font-bold text-slate-200">
              <span className="px-2 py-0.5 rounded-full bg-white/10 flex items-center gap-1">
                <Route className="h-3 w-3 text-cyan-400" /> {stats.distanceKm} km
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 flex items-center gap-1">
                <Clock3 className="h-3 w-3 text-amber-400" /> {stats.durationMin} min
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 flex items-center gap-1">
                <Gauge className="h-3 w-3 text-emerald-400" /> {stats.avgSpeed} km/h
              </span>
              {detectedStops.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {detectedStops.length} arrêts
                </span>
              )}
            </div>
          )}

          {/* Live Direct Status Beacon */}
          {liveMode && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold animate-pulse">
              <Radio className="h-3 w-3" />
              <span>LIVE 8s</span>
            </div>
          )}
        </div>
      </div>

      {/* FULL-WIDTH LEAFLET MAP CONTAINER */}
      <div ref={mapContainerRef} className="h-full w-full bg-slate-900" />

      {/* FLOATING BOTTOM REPLAY SCRUBBER HUD (Appears when route is loaded) */}
      {points.length >= 2 && (
        <div className="absolute bottom-5 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[700px] z-[1000] bg-slate-950/90 backdrop-blur-3xl border border-cyan-500/30 rounded-3xl p-3 sm:p-4 shadow-2xl space-y-2.5 text-white animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="p-2 rounded-2xl shrink-0 border"
                style={{
                  backgroundColor: `${tracerColor}25`,
                  color: tracerColor,
                  borderColor: `${tracerColor}55`
                }}
              >
                <Route className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-black tracking-tight flex items-center gap-2">
                  <span className="truncate">{deviceLabel}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-400/50 text-cyan-300 font-bold shrink-0">
                    {points.length} pts
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-300 font-medium truncate">
                  {stats.distanceKm} km • {stats.durationMin} min • {detectedStops.length} arrêts
                </div>
              </div>
            </div>

            {/* Current Speed Tachometer Badge */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="text-base font-black font-mono leading-none" style={{ color: tracerColor }}>
                  {Math.round(activePlaybackPoint?.speed || 0)} <span className="text-[10px] text-slate-300">km/h</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {activePlaybackPoint ? new Date(activePlaybackPoint.timestamp).toLocaleTimeString() : "--:--"}
                </div>
              </div>

              {/* Play / Pause Toggle Button */}
              <button
                type="button"
                onClick={togglePlayback}
                className="h-10 w-10 rounded-full text-slate-950 font-black shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: tracerColor, boxShadow: `0 8px 20px ${tracerColor}55` }}
                title={isPlaying ? "Pause" : "Lecture vidéo"}
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={replay}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                title="Rejouer depuis le début"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setTracerModalOpen(true)}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all"
                title="Personnaliser le Traceur (Couleur & Taille)"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-white"
                  style={{ backgroundColor: tracerColor, boxShadow: `0 0 8px ${tracerColor}` }}
                />
              </button>
            </div>
          </div>

          {/* Interactive Scrub Slider */}
          <div className="space-y-1">
            <Slider
              value={[playbackIndex]}
              min={0}
              max={points.length - 1}
              step={1}
              onValueChange={(val) => seekToPoint(val[0] || 0)}
              className="py-1 [&>span:first-child]:h-2 [&>span:first-child]:bg-white/15 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:bg-cyan-400 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Départ: {points[0] ? new Date(points[0].timestamp).toLocaleTimeString() : ""}</span>
              <span className="font-bold" style={{ color: tracerColor }}>Étape {playbackIndex + 1} / {points.length}</span>
              <span>Arrivée: {points[points.length - 1] ? new Date(points[points.length - 1].timestamp).toLocaleTimeString() : ""}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2026 VERTICAL ACTION DOCK (Frosted Glass VisionOS style on the right) */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-center gap-2">
        {/* Zoom In */}
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-bold"
          title="Zoomer +"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-bold"
          title="Dézoomer -"
        >
          <Minus className="h-4 w-4" />
        </button>

        {/* Center Active Vehicle / Point */}
        <button
          type="button"
          onClick={centerOnActive}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-cyan-400 shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          title="Centrer sur le véhicule ou le point"
        >
          <LocateFixed className="h-4 w-4" />
        </button>

        {/* Layers Switcher Modal Trigger */}
        <button
          type="button"
          onClick={() => setLayersModalOpen(true)}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-emerald-400 shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          title="Fonds de carte Google Maps"
        >
          <Layers className="h-4 w-4" />
        </button>

        {/* Fit to Route */}
        <button
          type="button"
          onClick={() => fitToRoute()}
          disabled={points.length < 2}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
          title="Ajuster la vue sur le trajet"
        >
          <Focus className="h-4 w-4" />
        </button>

        {/* Traceur Style Customization Trigger */}
        <button
          type="button"
          onClick={() => setTracerModalOpen(true)}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-2xl border border-white/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          title="Personnaliser le Traceur (Couleur & Taille)"
        >
          <span
            className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: tracerColor, boxShadow: `0 0 12px ${tracerColor}` }}
          />
        </button>

        {/* Mode Direct Live Toggle */}
        <button
          type="button"
          onClick={() => {
            if (liveMode) stopLive();
            else void startLive();
          }}
          className={`h-10 w-10 rounded-full backdrop-blur-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center ${
            liveMode
              ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/40 animate-pulse"
              : "bg-white/10 hover:bg-white/25 border-white/30 text-white"
          }`}
          title={liveMode ? "Désactiver le Mode Direct Live" : "Activer le Mode Direct Live (~8s)"}
        >
          <Radio className="h-4 w-4" />
        </button>

        {/* Auto-follow Toggle */}
        <button
          type="button"
          onClick={() => {
            setFollow(!follow);
            toast.info(follow ? "Suivi caméra désactivé" : "Suivi caméra activé");
          }}
          className={`h-10 w-10 rounded-full backdrop-blur-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center ${
            follow
              ? "bg-cyan-500/30 text-cyan-300 border-cyan-400/50"
              : "bg-white/10 hover:bg-white/25 border-white/30 text-slate-400"
          }`}
          title={follow ? "Suivi caméra automatique actif" : "Suivi caméra manuel"}
        >
          <Navigation className="h-4 w-4" />
        </button>

        {/* Geofencing Quick Trigger */}
        <button
          type="button"
          onClick={() => {
            setGeofenceEnabled(!geofenceEnabled);
            if (!geofenceEnabled) {
              setDeckOpen(true);
              setActiveDeckTab("geofence");
            }
          }}
          className={`h-10 w-10 rounded-full backdrop-blur-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center ${
            geofenceEnabled
              ? "bg-rose-500/30 text-rose-300 border-rose-400/50 shadow-rose-500/30"
              : "bg-white/10 hover:bg-white/25 border-white/30 text-white"
          }`}
          title="Paramètres de géofence"
        >
          <ShieldAlert className="h-4 w-4" />
        </button>
      </div>

      {/* FLOATING BOTTOM TRIGGER: FLOTTE & TRACKING DECK */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[990]">
        <button
          type="button"
          onClick={() => setDeckOpen(true)}
          className="group px-5 py-2.5 rounded-full bg-slate-900/60 dark:bg-slate-950/70 hover:bg-slate-900/85 dark:hover:bg-slate-950/90 backdrop-blur-2xl border border-white/25 hover:border-cyan-400/50 text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 font-bold text-xs"
        >
          <span className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Car className="h-3.5 w-3.5" />
          </span>
          <span className="tracking-wide">
            {selectedDevice ? `${selectedDevice.plate || selectedDevice.name}` : `Flotte & Trajet (${gpsDevices.length})`}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            Contrôles
          </span>
        </button>
      </div>

      {/* 2026 FLOATING VISIONOS CARD MODAL: GOOGLE MAPS LAYERS */}
      {layersModalOpen && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center p-3 sm:p-5 pointer-events-none">
          <div
            onClick={() => setLayersModalOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto transition-opacity"
          />

          <div className="relative pointer-events-auto w-full max-w-[500px] max-h-[85vh] bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-3xl border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] rounded-[2.5rem] overflow-hidden flex flex-col text-slate-100 ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                  <Layers className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">Cartographie & Google Maps</h3>
                  <p className="text-xs text-slate-400 font-medium">Sélectionnez le fond de carte de suivi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLayersModalOpen(false)}
                className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sft-fleet-scroll">
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-cyan-400 px-1">
                  Google Maps Officiel (Maroc)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(tileCatalog)
                    .filter(([_, meta]) => meta.isGoogle)
                    .map(([key, meta]) => {
                      const isActive = mapTheme === key;
                      return (
                        <div
                          key={key}
                          onClick={() => {
                            setMapTheme(key as MapTheme);
                            toast.success(`Fond changé: ${meta.label}`);
                            setLayersModalOpen(false);
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isActive
                              ? "bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400"
                              : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-white">{meta.label}</span>
                            {meta.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-cyan-300">
                                {meta.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-300 line-clamp-1">{meta.description}</p>
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] text-slate-400">
                            <span>Zoom: {meta.maxZoom}x</span>
                            {isActive ? (
                              <span className="text-cyan-400 font-black flex items-center gap-0.5">
                                <CheckCircle2 className="h-3 w-3" /> Actif
                              </span>
                            ) : (
                              <span>Choisir →</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
                  Autres Styles
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(tileCatalog)
                    .filter(([_, meta]) => !meta.isGoogle)
                    .map(([key, meta]) => {
                      const isActive = mapTheme === key;
                      return (
                        <div
                          key={key}
                          onClick={() => {
                            setMapTheme(key as MapTheme);
                            toast.success(`Fond changé: ${meta.label}`);
                            setLayersModalOpen(false);
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isActive
                              ? "bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400"
                              : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
                          }`}
                        >
                          <div className="font-extrabold text-xs text-white">{meta.label}</div>
                          <p className="text-[10px] text-slate-300 line-clamp-1">{meta.description}</p>
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] text-slate-400">
                            <span>Zoom: {meta.maxZoom}x</span>
                            {isActive && <CheckCircle2 className="h-3 w-3 text-cyan-400" />}
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

      {/* 2026 FLOATING VISIONOS CARD MODAL: CUSTOMISATION DU TRACEUR (Couleur & Taille) */}
      {tracerModalOpen && (
        <div className="fixed inset-0 z-[1650] flex items-center justify-center p-3 sm:p-5 pointer-events-none">
          <div
            onClick={() => setTracerModalOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto transition-opacity"
          />

          <div className="relative pointer-events-auto w-full max-w-[440px] bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-3xl border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] rounded-[2.5rem] overflow-hidden flex flex-col text-slate-100 ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="h-10 w-10 rounded-2xl border flex items-center justify-center"
                  style={{
                    backgroundColor: `${tracerColor}25`,
                    borderColor: `${tracerColor}60`,
                    color: tracerColor
                  }}
                >
                  <Route className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">Personnalisation du Traceur</h3>
                  <p className="text-xs text-slate-400 font-medium">Couleur, taille du traceur et épaisseur de ligne</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTracerModalOpen(false)}
                className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-5">
              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-white/10 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Aperçu en direct</div>
                  <div className="text-xs font-bold text-white">
                    Taille icône: <span style={{ color: tracerColor }}>{tracerSize}px</span> • Ligne:{" "}
                    <span style={{ color: tracerColor }}>{tracerWeight}px</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 rounded-full transition-all"
                    style={{
                      height: `${tracerWeight}px`,
                      backgroundColor: tracerColor,
                      boxShadow: tracerGlow ? `0 0 12px ${tracerColor}` : "none"
                    }}
                  />
                  <div
                    className="rounded-full flex items-center justify-center border-2 border-white transition-all"
                    style={{
                      width: `${Math.min(44, tracerSize)}px`,
                      height: `${Math.min(44, tracerSize)}px`,
                      backgroundColor: tracerColor,
                      boxShadow: tracerGlow ? `0 0 18px ${tracerColor}` : "none"
                    }}
                  >
                    <Navigation className="h-3.5 w-3.5 text-slate-950 fill-current" />
                  </div>
                </div>
              </div>

              {/* Color Presets + Custom Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Couleur du Traceur
                  </label>
                  <input
                    type="color"
                    value={tracerColor}
                    onChange={(e) => setTracerColor(e.target.value)}
                    className="h-7 w-10 rounded-lg cursor-pointer bg-transparent border border-white/20"
                    title="Choisir une couleur personnalisée"
                  />
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {TRACER_COLORS.map((c) => {
                    const active = tracerColor.toLowerCase() === c.value.toLowerCase();
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setTracerColor(c.value)}
                        className={`h-9 rounded-xl border-2 transition-all flex items-center justify-center ${
                          active ? "border-white scale-110 shadow-lg" : "border-white/15 opacity-80 hover:opacity-100"
                        }`}
                        style={{
                          backgroundColor: c.value,
                          boxShadow: active ? `0 0 14px ${c.value}` : "none"
                        }}
                        title={c.label}
                      >
                        {active && <CheckCircle2 className="h-4 w-4 text-slate-950" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tracer Icon Size Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Taille du marqueur Traceur</span>
                  <span className="font-mono font-black" style={{ color: tracerColor }}>
                    {tracerSize} px
                  </span>
                </div>
                <Slider
                  value={[tracerSize]}
                  min={22}
                  max={56}
                  step={2}
                  onValueChange={(v) => setTracerSize(v[0] || 36)}
                />
              </div>

              {/* Line Thickness Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Épaisseur du tracé GPS</span>
                  <span className="font-mono font-black" style={{ color: tracerColor }}>
                    {tracerWeight} px
                  </span>
                </div>
                <Slider
                  value={[tracerWeight]}
                  min={2}
                  max={12}
                  step={1}
                  onValueChange={(v) => setTracerWeight(v[0] || 5)}
                />
              </div>

              {/* Glow Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div>
                  <div className="text-xs font-bold text-white">Effet Néon Lumineux (Glow 2026)</div>
                  <div className="text-[10px] text-slate-400">Halo lumineux autour du traceur et de la ligne</div>
                </div>
                <Switch checked={tracerGlow} onCheckedChange={setTracerGlow} />
              </div>

              <Button
                onClick={() => {
                  setTracerModalOpen(false);
                  toast.success("Style du traceur appliqué !");
                }}
                className="w-full h-10 rounded-2xl font-black text-xs text-slate-950"
                style={{ backgroundColor: tracerColor }}
              >
                Appliquer sur la carte
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2026 CENTERED FLOATING VISIONOS CARD MODAL: FLOTTE & TRACKING CONTROLS */}
      {deckOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-5 pointer-events-none">
          <div
            onClick={() => setDeckOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto transition-opacity"
          />

          <div className="relative pointer-events-auto w-full max-w-[560px] h-[84vh] max-h-[680px] min-h-[440px] bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-3xl border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] rounded-[2.5rem] overflow-hidden flex flex-col text-slate-100 ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 space-y-3 shrink-0 bg-white/[0.02]">
              <div className="w-12 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-inner">
                    <Car className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                      <span>Tracking & Trajets SFT</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-cyan-500/25 text-cyan-300 border border-cyan-400/40">
                        {fleetStats.total} balises
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Véhicule actif : {selectedDevice ? (selectedDevice.plate || selectedDevice.name) : "Aucun"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={syncGps}
                    disabled={syncing}
                    className="h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold"
                    title="Synchroniser SFT"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncing ? "animate-spin text-cyan-400" : ""}`} />
                    Sync
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeckOpen(false)}
                    className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs (VisionOS style capsule tabs) */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveDeckTab("vehicules")}
                  className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeDeckTab === "vehicules"
                      ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Car className="h-3.5 w-3.5" /> Flotte
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeckTab("trajet")}
                  className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeDeckTab === "trajet"
                      ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Route className="h-3.5 w-3.5" /> Trajets
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeckTab("geofence")}
                  className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeDeckTab === "geofence"
                      ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" /> Géofence
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeckTab("rapport")}
                  className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeDeckTab === "rapport"
                      ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> Télémétrie
                </button>
              </div>
            </div>

            {/* Modal Body Container with custom scrollbar */}
            <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
              <style>{`
                .sft-fleet-scroll {
                  scrollbar-width: thin !important;
                  scrollbar-color: #06b6d4 rgba(255, 255, 255, 0.12) !important;
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
                  background: #06b6d4 !important;
                  border-radius: 9999px !important;
                  border: 2px solid rgba(15, 23, 42, 0.9) !important;
                  box-shadow: 0 0 10px rgba(6, 182, 212, 0.6) !important;
                }
                .sft-fleet-scroll::-webkit-scrollbar-thumb:hover {
                  background: #22d3ee !important;
                }
              `}</style>

              {/* TAB 1: FLOTTE / VÉHICULES */}
              {activeDeckTab === "vehicules" && (
                <div className="flex-1 min-h-0 overflow-y-scroll sft-fleet-scroll p-3 sm:p-4 space-y-3 pb-16">
                  {/* Search input inside modal */}
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher nom, plaque, IMEI..."
                      className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-cyan-400/60 transition"
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

                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                    <button
                      onClick={() => setFilter("all")}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                        filter === "all" ? "bg-cyan-500 text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      Tous ({fleetStats.total})
                    </button>
                    <button
                      onClick={() => setFilter("moving")}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 ${
                        filter === "moving" ? "bg-emerald-500 text-slate-950" : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Mouvement ({fleetStats.moving})
                    </button>
                    <button
                      onClick={() => setFilter("online")}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 ${
                        filter === "online" ? "bg-amber-500 text-slate-950" : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Arrêt ({fleetStats.online})
                    </button>
                    <button
                      onClick={() => setFilter("offline")}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 ${
                        filter === "offline" ? "bg-rose-500 text-white" : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      Hors ligne ({fleetStats.offline})
                    </button>
                  </div>

                  {/* Vehicle Cards List */}
                  <div className="space-y-2.5">
                    {filteredDevices.map((item) => {
                      const isSelected = item.id === vehicleId;
                      const isMoving = item.online && item.speed > 1;
                      const isOnline = item.online && item.speed <= 1;
                      const statusColor = isMoving ? "#10b981" : isOnline ? "#f59e0b" : "#f43f5e";
                      const statusLabel = isMoving ? "En mouvement" : isOnline ? "Arrêt" : "Hors ligne";

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setVehicleId(item.id);
                            if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
                              mapRef.current?.flyTo([item.lat, item.lng], 16, { duration: 0.5 });
                            }
                          }}
                          className={`relative overflow-hidden rounded-2xl border p-3.5 transition-all cursor-pointer ${
                            isSelected
                              ? "border-cyan-400/80 bg-cyan-500/15 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50"
                              : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: statusColor }}
                                />
                                <span className="font-extrabold text-sm text-white truncate">
                                  {item.plate || item.name}
                                </span>
                                {item.plate && (
                                  <span className="text-[11px] text-slate-300 font-semibold truncate hidden sm:inline">
                                    {item.name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                                IMEI: {item.imei || item.id}
                              </div>
                            </div>

                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0"
                              style={{
                                color: statusColor,
                                borderColor: `${statusColor}40`,
                                backgroundColor: `${statusColor}15`
                              }}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-white/5 text-[11px]">
                            <div>
                              <span className="text-[10px] text-slate-300 block">Vitesse</span>
                              <span className="font-bold text-white font-mono">{Math.round(item.speed)} km/h</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-300 block">Carburant</span>
                              <span className="font-bold text-amber-400 font-mono">
                                {typeof item.fuelLevel === "number" ? `${Math.round(item.fuelLevel)}%` : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-300 block">Mise à jour</span>
                              <span className="font-semibold text-slate-200">
                                {item.lastUpdate ? formatAgo(new Date(item.lastUpdate).getTime()) : "—"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVehicleId(item.id);
                                setActiveDeckTab("trajet");
                                void loadHistory(item.id);
                              }}
                              className="flex-1 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <Route className="h-3.5 w-3.5" />
                              <span>Charger le Trajet</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVehicleId(item.id);
                                if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
                                  mapRef.current?.flyTo([item.lat, item.lng], 16, { duration: 0.5 });
                                }
                                setDeckOpen(false);
                              }}
                              className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                              title="Voir sur la carte"
                            >
                              <LocateFixed className="h-4 w-4 text-cyan-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {!filteredDevices.length && (
                      <div className="text-center py-16 text-slate-400 space-y-2">
                        <Car className="h-8 w-8 mx-auto opacity-30" />
                        <p className="font-bold text-xs">Aucun véhicule trouvé</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: RELECTURE TRAJET (Filters & Controls) */}
              {activeDeckTab === "trajet" && (
                <div className="flex-1 min-h-0 overflow-y-scroll sft-fleet-scroll p-3 sm:p-4 space-y-4 pb-16">
                  {/* Selected Vehicle Card */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                    <div className="text-[11px] font-black uppercase text-cyan-400 tracking-wider">
                      Véhicule Cible
                    </div>
                    <select
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      className="w-full h-10 rounded-xl bg-slate-900 border border-white/20 px-3 text-xs font-bold text-white focus:outline-hidden"
                    >
                      <option value="">Sélectionnez un véhicule SFT...</option>
                      {gpsDevices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.plate || d.name} ({d.name || d.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider">
                      Période d'analyse
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { key: "1h", label: "1 Heure" },
                        { key: "today", label: "Aujourd'hui" },
                        { key: "24h", label: "24 Heures" },
                        { key: "7d", label: "7 Jours" }
                      ].map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => applyDatePreset(p.key as any)}
                          className={`py-1.5 rounded-xl text-xs font-bold transition border ${
                            datePreset === p.key
                              ? "bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md shadow-cyan-500/20"
                              : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Pickers */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Date début</span>
                      <DatePicker
                        value={fromDate}
                        onChange={(d) => {
                          setFromDate(d);
                          setDatePreset("custom");
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Date fin</span>
                      <DatePicker
                        value={toDate}
                        onChange={(d) => {
                          if (d) {
                            const adjusted = new Date(d);
                            adjusted.setHours(23, 59, 59, 999);
                            setToDate(adjusted);
                          } else {
                            setToDate(undefined);
                          }
                          setDatePreset("custom");
                        }}
                      />
                    </div>
                  </div>

                  {/* Load History Button */}
                  <Button
                    onClick={() => void loadHistory()}
                    disabled={!selectedDevice || loadingHistory}
                    className="w-full h-11 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
                  >
                    <Route className={`h-4 w-4 ${loadingHistory ? "animate-spin" : ""}`} />
                    <span>{loadingHistory ? "Analyse du trajet..." : "Charger & Tracer l'Historique"}</span>
                  </Button>

                  {/* Playback Configuration Box */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-300">Vidéo Trajectory Player</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={togglePlayback}
                          disabled={!selectedDevice || loadingHistory}
                          className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition disabled:opacity-40 flex items-center gap-1"
                        >
                          {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                          <span>{isPlaying ? "Pause" : "Lecture"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={replay}
                          disabled={!selectedDevice || loadingHistory}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition disabled:opacity-40"
                          title="Rejouer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                        <span>Vitesse d'animation</span>
                        <span className="text-cyan-400 font-mono">{playSpeedMs} ms / étape</span>
                      </div>
                      <Slider
                        value={[playSpeedMs]}
                        min={80}
                        max={600}
                        step={20}
                        onValueChange={(v) => setPlaySpeedMs(v[0] || 160)}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-xs text-slate-300 font-semibold">Suivi automatique de la caméra</span>
                      <Switch checked={follow} onCheckedChange={(v) => setFollow(v)} />
                    </div>
                  </div>

                  {/* Traceur Customization Box (Couleur & Taille) */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-cyan-400">
                        Personnalisation Traceur (Couleur & Taille)
                      </span>
                      <span
                        className="h-4 w-4 rounded-full border border-white"
                        style={{ backgroundColor: tracerColor, boxShadow: `0 0 10px ${tracerColor}` }}
                      />
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {TRACER_COLORS.map((c) => {
                        const active = tracerColor.toLowerCase() === c.value.toLowerCase();
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setTracerColor(c.value)}
                            className={`h-7 rounded-lg border transition-all flex items-center justify-center ${
                              active ? "border-white scale-105 shadow-md" : "border-white/15 opacity-75 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          >
                            {active && <CheckCircle2 className="h-3.5 w-3.5 text-slate-950" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold">
                          <span>Taille Traceur</span>
                          <span style={{ color: tracerColor }}>{tracerSize}px</span>
                        </div>
                        <Slider
                          value={[tracerSize]}
                          min={22}
                          max={56}
                          step={2}
                          onValueChange={(v) => setTracerSize(v[0] || 36)}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold">
                          <span>Épaisseur Ligne</span>
                          <span style={{ color: tracerColor }}>{tracerWeight}px</span>
                        </div>
                        <Slider
                          value={[tracerWeight]}
                          min={2}
                          max={12}
                          step={1}
                          onValueChange={(v) => setTracerWeight(v[0] || 5)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GEOFENCING & SÉCURITÉ */}
              {activeDeckTab === "geofence" && (
                <div className="flex-1 min-h-0 overflow-y-scroll sft-fleet-scroll p-3 sm:p-4 space-y-4 pb-16">
                  {/* Status Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent border border-rose-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                        <ShieldAlert className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="font-black text-sm text-white">Geofencing & Périmètre</div>
                        <div className="text-[11px] text-slate-300">
                          Surveillance d'entrée et de sortie en temps réel
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={geofenceEnabled}
                      onCheckedChange={(v) => {
                        setGeofenceEnabled(v);
                        if (v && !geofenceCircleRef.current) setGeofenceAtCenter();
                      }}
                    />
                  </div>

                  {/* Radius Slider */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Rayon de la zone</span>
                      <span className="font-mono font-black text-rose-400">{geofenceRadiusM} mètres</span>
                    </div>
                    <Slider
                      value={[geofenceRadiusM]}
                      min={100}
                      max={3000}
                      step={50}
                      onValueChange={(v) => setGeofenceRadiusM(v[0] || 400)}
                      disabled={!geofenceEnabled}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Positionner la zone
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={setGeofenceOnVehicle}
                        disabled={!geofenceEnabled || !selectedDevice}
                        className="rounded-xl h-10 text-xs font-bold bg-white/5 hover:bg-white/10 text-white border-white/15"
                      >
                        <Car className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
                        Sur le véhicule
                      </Button>
                      <Button
                        variant="outline"
                        onClick={setGeofenceAtCenter}
                        disabled={!geofenceEnabled}
                        className="rounded-xl h-10 text-xs font-bold bg-white/5 hover:bg-white/10 text-white border-white/15"
                      >
                        <Target className="h-3.5 w-3.5 mr-1.5 text-rose-400" />
                        Centre de la carte
                      </Button>
                    </div>

                    <Button
                      variant={drawGeofence ? "default" : "outline"}
                      onClick={() => {
                        setDrawGeofence(!drawGeofence);
                        if (!drawGeofence) {
                          toast.info("Cliquez n'importe où sur la carte pour définir la zone");
                          setDeckOpen(false);
                        }
                      }}
                      disabled={!geofenceEnabled}
                      className={`w-full h-10 rounded-xl text-xs font-bold transition ${
                        drawGeofence
                          ? "bg-rose-500 text-white font-black animate-pulse"
                          : "bg-white/5 hover:bg-white/10 text-white border-white/15"
                      }`}
                    >
                      <MapPin className="h-3.5 w-3.5 mr-1.5" />
                      {drawGeofence ? "Mode actif : Cliquez sur la carte" : "Définir par clic sur la carte"}
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 4: RAPPORT & TÉLÉMÉTRIE */}
              {activeDeckTab === "rapport" && (
                <div className="flex-1 min-h-0 overflow-y-scroll sft-fleet-scroll p-3 sm:p-4 space-y-4 pb-16">
                  {/* Telemetry Metric Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Distance</span>
                      <span className="text-base font-black text-cyan-400 font-mono">{stats.distanceKm} km</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Durée</span>
                      <span className="text-base font-black text-white font-mono">{stats.durationMin} min</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Vitesse Moy.</span>
                      <span className="text-base font-black text-emerald-400 font-mono">{stats.avgSpeed} km/h</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Vitesse Max</span>
                      <span className="text-base font-black text-amber-400 font-mono">{stats.maxSpeed} km/h</span>
                    </div>
                  </div>

                  {/* Fuel & Battery telemetry if selected */}
                  {selectedDevice && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                      <div className="text-[11px] font-black uppercase text-slate-300 tracking-wider">
                        Capteurs Balise & Énergie
                      </div>
                      <div className="space-y-2">
                        {typeof selectedDevice.fuelLevel === "number" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <span className="flex items-center gap-1.5 text-amber-400">
                                <Fuel className="h-4 w-4" /> Niveau de carburant
                              </span>
                              <span>{Math.round(selectedDevice.fuelLevel)}%</span>
                            </div>
                            <Progress value={clamp(selectedDevice.fuelLevel, 0, 100)} className="h-2 bg-white/10 [&>div]:bg-amber-400" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-white">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <Battery className="h-4 w-4" /> Tension Batterie
                            </span>
                            <span>{selectedDevice.battery}%</span>
                          </div>
                          <Progress value={clamp(selectedDevice.battery, 0, 100)} className="h-2 bg-white/10 [&>div]:bg-emerald-400" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detected Stops Table */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-300">Arrêts Détectés ({detectedStops.length})</span>
                      <span className="text-[10px] text-slate-400">&gt; 2 min de stationnement</span>
                    </div>
                    {detectedStops.length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto sft-fleet-scroll pr-1">
                        {detectedStops.map((s, idx) => (
                          <div
                            key={`${idx}-${s.from}`}
                            className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 font-black flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-white">{s.durationMin} minutes</span>
                                <span className="text-slate-400 block text-[10px]">
                                  {new Date(s.from).toLocaleTimeString()} → {new Date(s.to).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                mapRef.current?.flyTo([s.lat, s.lng], 17, { duration: 0.5 });
                                setDeckOpen(false);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 font-bold text-[10px]"
                            >
                              Voir
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 py-3 text-center">Aucun arrêt prolongé détecté</div>
                    )}
                  </div>

                  {/* External Google Maps & Street View Links */}
                  {selectedDevice && Number.isFinite(selectedDevice.lat) && Number.isFinite(selectedDevice.lng) && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${selectedDevice.lat},${selectedDevice.lng}`,
                            "_blank"
                          );
                        }}
                        className="rounded-2xl h-10 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1 text-blue-400" />
                        Google Maps ↗
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          window.open(
                            `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedDevice.lat},${selectedDevice.lng}`,
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

                  {/* Export Action Buttons */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Exporter le Trajet
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleExport("gpx")}
                        disabled={!points.length}
                        className="rounded-2xl h-10 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/15"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5 text-cyan-400" /> GPX
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleExport("csv")}
                        disabled={!points.length}
                        className="rounded-2xl h-10 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/15"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> CSV
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleExport("txt")}
                        disabled={!points.length}
                        className="rounded-2xl h-10 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/15"
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5 text-purple-400" /> Rapport
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Bottom Quick Scroll & Fleet Status Bar */}
              <div className="shrink-0 px-4 py-2 bg-slate-950/85 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Car className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{filteredDevices.length} véhicules SFT</span>
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
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-400/30 transition flex items-center gap-1 text-[10px] font-bold cursor-pointer"
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
