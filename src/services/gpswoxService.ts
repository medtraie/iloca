import { trackingService } from "@/services/trackingService";
import { fuelService } from "@/services/fuelService";
import { vehiclesRepository } from "@/repositories/vehiclesRepository";
import { settingsRepository } from "@/repositories/settingsRepository";
import { Vehicle } from "@/types/appData";
import {
  getLatestCachedPayload,
  getLatestSnapshotPayload,
  saveGpsSnapshot,
  upsertGpsDevicesCache,
  getSupabaseClient
} from "@/services/supabaseService";

type AnyRecord = Record<string, any>;

export type GpswoxDevice = {
  id: string;
  name: string;
  plate: string;
  lat: number;
  lng: number;
  speed: number;
  online: boolean;
  ignition: boolean;
  fuelLevel?: number;
  lastUpdate?: string;
  raw: AnyRecord;
};

export type GpswoxEvent = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  date: string;
  deviceId?: string;
  raw: AnyRecord;
};

export type GpswoxFuelRecord = {
  id: string;
  deviceId: string;
  quantity: number;
  price?: number;
  station?: string;
  date: string;
  raw: AnyRecord;
};

export type GpswoxAnalytics = {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  averageSpeed: number;
};

const USER_HASH_KEY = "gpswox:user_api_hash";
const USER_HASH_TS_KEY = "gpswox:user_api_hash_ts";
const HASH_TTL_MS = 1000 * 60 * 60 * 10;
const DEFAULT_GPSWOX_BASE_URL = "https://trackpremierlocation.com";
const DEFAULT_GPSWOX_API_URL = `${DEFAULT_GPSWOX_BASE_URL}/api`;
const DEFAULT_LOCAL_API_URL = "http://127.0.0.1/api";

const ensureUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const getEnvBaseUrl = () =>
  (import.meta.env.VITE_GPSWOX_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_GPSWOX_URL as string | undefined) ||
  DEFAULT_GPSWOX_BASE_URL;

const getGpsConfig = async () => {
  const envApi = (import.meta.env.VITE_GPSWOX_API_URL as string | undefined) || "";
  const envEmail = (import.meta.env.VITE_GPSWOX_EMAIL as string | undefined) || (import.meta.env.VITE_GPSWOX_USER as string | undefined) || "";
  const envPassword =
    (import.meta.env.VITE_GPSWOX_PASSWORD as string | undefined) ||
    (import.meta.env.VITE_GPSWOX_MDPS as string | undefined) ||
    "";

  let db = null as Awaited<ReturnType<typeof settingsRepository.getGpsSettings>> | null;
  try {
    db = await settingsRepository.getGpsSettings();
  } catch {
    db = null;
  }

  const apiUrl = envApi || (db?.api_url ? ensureUrl(db.api_url) : "");
  const email = envEmail || db?.email || "";
  const password = envPassword || db?.password || "";

  return { apiUrl, email, password };
};

const getApiCandidates = async () => {
  const envApi = (import.meta.env.VITE_GPSWOX_API_URL as string | undefined) || "";
  const { apiUrl } = await getGpsConfig();

  const candidates: string[] = [];

  // 1. Top priority: User configured apiUrl in Settings (/settings)
  if (apiUrl) {
    const clean = apiUrl.trim().replace(/\/+$/, "");
    if (/^https?:\/\//i.test(clean)) {
      candidates.push(clean);
      if (!/\/api$/i.test(clean)) candidates.push(`${clean}/api`);
    } else {
      candidates.push(`http://${clean}/api`);
      candidates.push(`http://${clean}`);
      candidates.push(`https://${clean}/api`);
      candidates.push(`https://${clean}`);
    }
  }

  // 2. Env API URL
  if (envApi) {
    const clean = envApi.trim().replace(/\/+$/, "");
    candidates.push(clean);
    if (!/\/api$/i.test(clean)) candidates.push(`${clean}/api`);
  }

  // 3. Fallbacks
  const envBase = getEnvBaseUrl().trim().replace(/\/+$/, "");
  if (envBase) {
    candidates.push(`${envBase}/api`);
  }
  candidates.push(DEFAULT_GPSWOX_API_URL);

  return [...new Set(candidates.filter(Boolean).map((value) => value.replace(/\/+$/, "")))];
};

const parseNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const parseBool = (v: any) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  if (typeof v === "string") return ["1", "true", "on", "online", "moving"].includes(v.toLowerCase());
  return false;
};

const splitHistoryDateTime = (input?: string) => {
  if (!input) return { date: "", time: "" };
  const asDate = new Date(input);
  if (Number.isNaN(asDate.getTime())) return { date: "", time: "" };
  const yyyy = asDate.getFullYear();
  const mm = String(asDate.getMonth() + 1).padStart(2, "0");
  const dd = String(asDate.getDate()).padStart(2, "0");
  const hh = String(asDate.getHours()).padStart(2, "0");
  const mi = String(asDate.getMinutes()).padStart(2, "0");
  const ss = String(asDate.getSeconds()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}:${ss}` };
};

const pickArray = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.devices)) return payload.devices;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.objects)) return payload.objects;
  if (Array.isArray(payload.list)) return payload.list;
  if (Array.isArray(payload.rows)) return payload.rows;
  const values = Object.values(payload);
  const nestedArray = values.find((value) => Array.isArray(value));
  if (Array.isArray(nestedArray)) return nestedArray as any[];
  const nestedObject = values.find((value) => value && typeof value === "object" && !Array.isArray(value));
  if (nestedObject && typeof nestedObject === "object") {
    const nestedValues = Object.values(nestedObject as Record<string, unknown>);
    const nestedObjectArray = nestedValues.find((value) => Array.isArray(value));
    if (Array.isArray(nestedObjectArray)) return nestedObjectArray as any[];
    if (nestedValues.length && nestedValues.every((value) => value && typeof value === "object")) {
      return nestedValues as any[];
    }
  }
  if (values.length && values.every((value) => value && typeof value === "object")) {
    return values as any[];
  }
  return [];
};

const normalizeCachedPayload = (payload: any): AnyRecord[] => {
  if (!payload) return [];
  const direct = pickArray(payload);
  if (direct.length) return direct;
  if (payload.payload) {
    const nested = pickArray(payload.payload);
    if (nested.length) return nested;
  }
  if (typeof payload === "object") return [payload];
  return [];
};

const readHashFromSupabase = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) return "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return "";

  const { data, error } = await supabase
    .from("app_settings")
    .select("setting_key, setting_value")
    .in("setting_key", [USER_HASH_KEY, USER_HASH_TS_KEY]);
  if (error) return "";

  const map = (data || []).reduce<Record<string, any>>((acc, row: any) => {
    acc[String(row.setting_key)] = row.setting_value;
    return acc;
  }, {});

  const hash = typeof map[USER_HASH_KEY] === "string" ? map[USER_HASH_KEY] : "";
  const tsRaw = map[USER_HASH_TS_KEY];
  const ts = typeof tsRaw === "number" ? tsRaw : Number(tsRaw || 0);
  if (!hash || !ts || Date.now() - ts > HASH_TTL_MS) return "";
  return hash;
};

const writeHashToSupabase = async (hash: string) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return;

  const payload = [
    { setting_key: USER_HASH_KEY, setting_value: hash },
    { setting_key: USER_HASH_TS_KEY, setting_value: Date.now() }
  ];
  await supabase.from("app_settings").upsert(payload, { onConflict: "user_id,setting_key" });
};

const buildUrl = (base: string, path: string, params?: Record<string, string>) => {
  const normalizedBase = base.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${cleanPath}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, v);
    }
  });
  return url.toString();
};

const parseHash = (payload: any): string => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return (
    payload.user_api_hash ||
    payload.api_hash ||
    payload.hash ||
    payload.data?.user_api_hash ||
    payload.user?.api_hash ||
    ""
  );
};

const detectSeverity = (item: AnyRecord): "info" | "warning" | "critical" => {
  const candidate = String(item.severity || item.level || item.type || "").toLowerCase();
  if (candidate.includes("critical") || candidate.includes("panic") || candidate.includes("sos")) return "critical";
  if (candidate.includes("warn") || candidate.includes("alarm") || candidate.includes("offline")) return "warning";
  return "info";
};

function extractDevicesStrict(payload: any): any[] {
  const roots = pickArray(payload);
  const queue: any[] = roots.length ? [...roots] : [payload];
  const devices: any[] = [];

  while (queue.length) {
    const node = queue.shift();
    if (node == null) continue;
    if (Array.isArray(node)) {
      queue.push(...node);
      continue;
    }
    if (typeof node !== "object") continue;

    if (Array.isArray(node.items)) {
      queue.push(...node.items);
      continue;
    }

    if (
      "lat" in node ||
      "latitude" in node ||
      "position" in node ||
      "imei" in node ||
      "device_id" in node ||
      "online" in node ||
      "speed" in node
    ) {
      devices.push(node);
    }
  }

  const seen = new Set<string>();
  return devices.filter((item) => {
    const key = String(item?.id ?? item?.device_id ?? item?.imei ?? item?.name ?? "").toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const parseDevice = (item: AnyRecord): GpswoxDevice => {
  const lat = parseNumber(item.lat ?? item.latitude ?? item.position?.lat ?? item.location?.lat);
  const lng = parseNumber(item.lng ?? item.longitude ?? item.position?.lng ?? item.location?.lng);
  const id = String(item.id ?? item.device_id ?? item.imei ?? item.uniqueId ?? item.uuid ?? crypto.randomUUID());
  const name = String(item.name ?? item.title ?? item.device_name ?? item.object_name ?? item.imei ?? "GPS Device");
  const plate = String(item.plate_number ?? item.plate ?? item.registration ?? item.immatriculation ?? name);
  const speed = parseNumber(item.speed ?? item.current_speed ?? item.attributes?.speed);
  
  const onlineRaw = String(item.online ?? item.active ?? item.status ?? item.connection_status ?? "").toLowerCase().trim();
  const iconColor = String(item.icon_color ?? "").toLowerCase().trim();
  const timeRaw = String(item.time ?? "").toLowerCase();

  const isOffline = onlineRaw === "offline" || iconColor === "red" || timeRaw.includes("non connecté");
  const isMoving = speed > 2 || onlineRaw === "moving" || iconColor === "green";
  const isStationary = !isOffline && !isMoving && (onlineRaw === "ack" || onlineRaw === "stopped" || onlineRaw === "engine" || onlineRaw === "online" || iconColor === "yellow" || (lat !== 0 && lng !== 0));
  const online = !isOffline && (isMoving || isStationary);
  const ignition = parseBool(item.ignition ?? item.engine ?? item.attributes?.ignition ?? (onlineRaw === "ack" || isMoving));
  const fuelLevel = item.fuel_level ?? item.fuelLevel ?? item.attributes?.fuel_level ?? item.sensors?.fuel_level;
  const lastUpdate = item.time ?? item.last_update ?? item.server_time ?? item.updated_at ?? item.timestamp;
  return {
    id,
    name,
    plate,
    lat,
    lng,
    speed,
    online,
    ignition,
    fuelLevel: fuelLevel !== undefined && fuelLevel !== null ? parseNumber(fuelLevel) : undefined,
    lastUpdate: lastUpdate ? String(lastUpdate) : undefined,
    raw: item
  };
};

const parseEvent = (item: AnyRecord): GpswoxEvent => {
  const id = String(item.id ?? item.event_id ?? crypto.randomUUID());
  const title = String(item.title ?? item.name ?? item.type ?? "Alerte GPS");
  const message = String(item.message ?? item.description ?? item.text ?? title);
  const deviceId = item.device_id ? String(item.device_id) : undefined;
  const date = String(item.time ?? item.date ?? item.created_at ?? new Date().toISOString());
  return { id, severity: detectSeverity(item), title, message, deviceId, date, raw: item };
};

const parseFuel = (item: AnyRecord): GpswoxFuelRecord => {
  const id = String(item.id ?? item.fill_id ?? crypto.randomUUID());
  const quantity = parseNumber(item.quantity ?? item.liters ?? item.volume ?? item.fuel ?? item.value);
  const price = parseNumber(item.price ?? item.cost ?? item.amount);
  const station = item.station || item.place || item.address || "";
  const date = String(item.date ?? item.time ?? item.created_at ?? new Date().toISOString());
  const deviceId = String(item.device_id ?? item.object_id ?? item.imei ?? "");
  return { id, deviceId, quantity, price: price || undefined, station: station || undefined, date, raw: item };
};

async function fetchJson(url: string) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`GPSWOX_HTTP_${res.status}`);
  }
  return res.json();
}

async function getUserApiHash() {
  const directHash = (import.meta.env.VITE_GPSWOX_USER_API_HASH as string | undefined) || "";
  if (directHash) return directHash;
  const cached = await readHashFromSupabase();
  if (cached) return cached;

  const { email, password } = await getGpsConfig();
  if (!email || !password) return "";

  const apiCandidates = await getApiCandidates();
  for (const base of apiCandidates) {
    // 1) Try GET /login?email=...&password=...
    const loginViaQuery = buildUrl(base, "/login", { email, password });
    try {
      const payload = await fetchJson(loginViaQuery);
      const hash = parseHash(payload);
      if (hash) {
        await writeHashToSupabase(hash);
        return hash;
      }
    } catch {
    }

    // 2) Try POST /login with form data (standard Laravel GPSwox)
    try {
      const loginEndpoint = `${base.replace(/\/+$/, "")}/login`;
      const formParams = new URLSearchParams();
      formParams.append("email", email);
      formParams.append("password", password);
      const res = await fetch(loginEndpoint, {
        method: "POST",
        body: formParams
      });
      if (res.ok) {
        const payload = await res.json();
        const hash = parseHash(payload);
        if (hash) {
          await writeHashToSupabase(hash);
          return hash;
        }
      }
    } catch {
    }

    // 3) Try POST /login with JSON body
    try {
      const loginEndpoint = `${base.replace(/\/+$/, "")}/login`;
      const res = await fetch(loginEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const payload = await res.json();
        const hash = parseHash(payload);
        if (hash) {
          await writeHashToSupabase(hash);
          return hash;
        }
      }
    } catch {
    }
  }
  return "";
}

async function request(path: string, params?: Record<string, string>) {
  const userApiHash = await getUserApiHash();
  if (!userApiHash) {
    throw new Error("GPSWOX_MISSING_USER_API_HASH");
  }
  let lastError: unknown = null;
  for (const base of await getApiCandidates()) {
    try {
      const url = buildUrl(base, path, { ...params, user_api_hash: userApiHash });
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("GPSWOX_REQUEST_FAILED");
}

async function requestViaSupabaseFunction(target: "devices" | "alerts" | "reports") {
  const sbUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "";
  const sbKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    "";
  if (!sbUrl || !sbKey) {
    return null;
  }

  const base = sbUrl.replace(/\/+$/, "");
  const endpointByTarget: Record<typeof target, string[]> = {
    devices: [
      `/functions/v1/gpswox?target=${encodeURIComponent(target)}`,
      "/functions/v1/gpswox-map",
      "/functions/v1/gpswox"
    ],
    alerts: [
      `/functions/v1/gpswox?target=${encodeURIComponent(target)}`,
      "/functions/v1/gpswox-alerts"
    ],
    reports: [
      `/functions/v1/gpswox?target=${encodeURIComponent(target)}`,
      "/functions/v1/gpswox-reports"
    ]
  };

  let lastError: unknown = null;
  for (const endpoint of endpointByTarget[target]) {
    try {
      const response = await fetch(`${base}${endpoint}`, {
        method: "GET",
        headers: sbKey
          ? {
              apikey: sbKey,
              Authorization: `Bearer ${sbKey}`
            }
          : undefined
      });
      if (!response.ok) {
        throw new Error(`SUPABASE_FUNCTION_HTTP_${response.status}`);
      }
      const payload = await response.json();
      if (!payload?.ok && payload?.data === undefined) {
        throw new Error(payload?.error || "SUPABASE_FUNCTION_FAILED");
      }
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("SUPABASE_FUNCTION_FAILED");
}

async function getDevicesFromSupabaseCache(): Promise<GpswoxDevice[]> {
  const cachedRows =
    (await getLatestCachedPayload("gpswox_devices_cache")) || (await getLatestSnapshotPayload("devices"));
  if (!cachedRows?.length) return [];
  const devices = cachedRows
    .flatMap((row) => normalizeCachedPayload(row))
    .map(parseDevice)
    .filter((device) => device.id);
  if (!devices.length) return [];
  await syncDevicesInLocalStorage(devices);
  await syncTrackingFromDevices(devices);
  return devices;
}

async function getEventsFromSupabaseCache(): Promise<GpswoxEvent[]> {
  const cachedRows =
    (await getLatestCachedPayload("gpswox_events_cache")) || (await getLatestSnapshotPayload("events"));
  if (!cachedRows?.length) return [];
  return cachedRows.flatMap((row) => normalizeCachedPayload(row)).map(parseEvent);
}

async function getFuelFromSupabaseCache(): Promise<GpswoxFuelRecord[]> {
  const cachedRows =
    (await getLatestCachedPayload("gpswox_reports_cache")) || (await getLatestSnapshotPayload("fuel"));
  if (!cachedRows?.length) return [];
  return cachedRows.flatMap((row) => normalizeCachedPayload(row)).map(parseFuel).filter((item) => item.quantity > 0);
}

function splitVehicleName(input: string) {
  const raw = input.trim();
  if (!raw) return { brand: "GPS", model: "Tracker" };
  const chunks = raw.split(" ").filter(Boolean);
  if (chunks.length < 2) return { brand: chunks[0] || "GPS", model: "Tracker" };
  return { brand: chunks[0], model: chunks.slice(1).join(" ") };
}

function mapDeviceToVehicle(device: GpswoxDevice): Omit<Vehicle, "id" | "created_at" | "updated_at"> {
  const parts = splitVehicleName(device.name);
  return {
    brand: parts.brand,
    model: parts.model,
    marque: parts.brand,
    modele: parts.model,
    registration: device.plate || device.id,
    immatriculation: device.plate || device.id,
    etat_vehicule: device.online ? "loue" : "disponible",
    kilometrage: 0,
    km_depart: 0
  };
}

async function syncDevicesInLocalStorage(devices: GpswoxDevice[]) {
  const vehicles = await vehiclesRepository.listVehicles();
  for (const device of devices) {
    const linked = vehicles.find(
      (vehicle) =>
        (vehicle.registration && vehicle.registration === device.plate) ||
        (vehicle.immatriculation && vehicle.immatriculation === device.plate)
    );
    if (!linked) {
      await vehiclesRepository.createVehicle(mapDeviceToVehicle(device));
      continue;
    }
    await vehiclesRepository.updateVehicle(linked.id, {
      etat_vehicule: device.online ? "loue" : "disponible",
      registration: linked.registration || device.plate,
      immatriculation: linked.immatriculation || device.plate
    } as Partial<Vehicle>);
  }
}

async function syncTrackingFromDevices(devices: GpswoxDevice[]) {
  const vehicles = await vehiclesRepository.listVehicles();
  for (const device of devices) {
    if (!device.lat || !device.lng) continue;
    const linked = vehicles.find(
      (vehicle) =>
        (vehicle.registration && vehicle.registration === device.plate) ||
        (vehicle.immatriculation && vehicle.immatriculation === device.plate)
    );
    if (!linked) continue;
    await trackingService.addPosition(linked.id, {
      lat: device.lat,
      lng: device.lng,
      speed: device.speed,
      timestamp: Date.now()
    });
  }
}

async function getDevices(): Promise<GpswoxDevice[]> {
  try {
    const payload = await requestViaSupabaseFunction("devices");
    if (payload?.data) {
      const devices = extractDevicesStrict(payload.data).map(parseDevice).filter((d) => d.id);
      if (devices.length) {
        await syncDevicesInLocalStorage(devices);
        await syncTrackingFromDevices(devices);
        await saveGpsSnapshot("devices", devices as any);
        await upsertGpsDevicesCache(
          devices.map((device) => ({
            external_id: device.id,
            name: device.name,
            plate: device.plate,
            payload: device.raw
          }))
        );
        return devices;
      }
    }
  } catch {
  }
  const endpoints = ["/get_devices", "/devices", "/objects"];
  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const payload = await request(endpoint);
      const devices = extractDevicesStrict(payload).map(parseDevice).filter((d) => d.id);
      if (devices.length) {
        await syncDevicesInLocalStorage(devices);
        await syncTrackingFromDevices(devices);
        await saveGpsSnapshot("devices", devices as any);
        await upsertGpsDevicesCache(
          devices.map((device) => ({
            external_id: device.id,
            name: device.name,
            plate: device.plate,
            payload: device.raw
          }))
        );
        return devices;
      }
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    const cached = await getDevicesFromSupabaseCache();
    if (cached.length) return cached;
    throw lastError;
  }
  return getDevicesFromSupabaseCache();
}

export function parseDevicePositions(device: any, from?: string, to?: string): Array<{ lat: number; lng: number; timestamp: number; speed: number }> {
  if (!device) return [];
  const raw = device.raw || device;
  const deviceData = raw.device_data || raw.traccar || {};

  const posString: string =
    deviceData.latest_positions ||
    raw.latest_positions ||
    raw.traccar?.latest_positions ||
    device.latest_positions ||
    "";

  const pts: Array<{ lat: number; lng: number; timestamp: number; speed: number }> = [];

  const movedAtRaw = deviceData.moved_at || raw.moved_at || deviceData.moved_timestamp || raw.moved_timestamp;
  const stoppedAtRaw = deviceData.stoped_at || raw.stoped_at || deviceData.time || raw.time;

  let endTs = stoppedAtRaw ? new Date(stoppedAtRaw).getTime() : Date.now();
  if (!Number.isFinite(endTs) || endTs <= 0) endTs = Date.now();

  let startTs = movedAtRaw ? new Date(movedAtRaw).getTime() : endTs - 20 * 60 * 1000;
  if (!Number.isFinite(startTs) || startTs <= 0 || startTs >= endTs) {
    startTs = endTs - 20 * 60 * 1000;
  }

  // 1. Parse latest_positions coordinate string (lat/lng;lat/lng;...)
  if (posString && typeof posString === "string") {
    const rawPairs = posString.split(";").map((s) => s.trim()).filter(Boolean);
    if (rawPairs.length > 0) {
      // In GPSwox, latest_positions is newest first, so we reverse it to form a forward chronological trip
      const chronological = rawPairs.slice().reverse();
      const stepMs = Math.max(1500, Math.floor((endTs - startTs) / chronological.length));

      chronological.forEach((pair, idx) => {
        const [latStr, lngStr] = pair.split("/");
        const lat = Number(latStr);
        const lng = Number(lngStr);
        if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
          const ptTs = startTs + idx * stepMs;
          const isLast = idx === chronological.length - 1;
          const speed = isLast ? 0 : Math.round(28 + Math.sin(idx * 0.7) * 14);
          pts.push({ lat, lng, timestamp: ptTs, speed });
        }
      });
    }
  }

  // 2. Parse tail if latest_positions was empty
  const tail = raw.tail || device.tail;
  if (pts.length < 2 && Array.isArray(tail) && tail.length > 0) {
    const stepMs = Math.max(1500, Math.floor((endTs - startTs) / tail.length));
    tail.forEach((t: any, idx: number) => {
      const lat = Number(t.lat ?? t.latitude);
      const lng = Number(t.lng ?? t.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
        pts.push({
          lat,
          lng,
          timestamp: startTs + idx * stepMs,
          speed: idx === tail.length - 1 ? 0 : 30
        });
      }
    });
  }

  // 3. Append current latest position if valid and not identical to last point
  const curLat = Number(device.lastPosition?.lat ?? device.lat ?? raw.lat);
  const curLng = Number(device.lastPosition?.lng ?? device.lng ?? raw.lng);
  if (Number.isFinite(curLat) && Number.isFinite(curLng) && (curLat !== 0 || curLng !== 0)) {
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last.lat - curLat) > 0.00003 || Math.abs(last.lng - curLng) > 0.00003) {
      pts.push({
        lat: curLat,
        lng: curLng,
        timestamp: endTs,
        speed: Number(device.speed ?? raw.speed ?? 0)
      });
    }
  }

  return pts;
}

async function getDeviceHistory(deviceId: string, from?: string, to?: string, deviceContext?: any) {
  const fromParts = splitHistoryDateTime(from);
  const toParts = splitHistoryDateTime(to);

  // 1. Try Supabase Edge Function
  try {
    const sb = getSupabaseClient();
    if (sb) {
      const { data, error } = await sb.functions.invoke("gpswox", {
        body: {
          target: "history",
          device_id: deviceId,
          from,
          to,
          from_date: fromParts.date,
          from_time: fromParts.time,
          to_date: toParts.date,
          to_time: toParts.time
        },
        method: "POST"
      });

      if (!error && (Array.isArray(data?.data) || Array.isArray(data?.items))) {
        const rawList = data?.data || data?.items || [];
        const records = rawList.map((item: any) => ({
          lat: parseNumber(item.lat ?? item.latitude),
          lng: parseNumber(item.lng ?? item.longitude),
          timestamp: Number(item.timestamp ?? (item.raw_time ? Number(item.raw_time) * 1000 : null) ?? (item.time ? new Date(item.time).getTime() : null) ?? Date.now()),
          speed: parseNumber(item.speed ?? item.current_speed)
        })).filter((record: any) => Number.isFinite(record.lat) && Number.isFinite(record.lng) && (record.lat !== 0 || record.lng !== 0));

        if (records.length >= 2) {
          return records;
        }
      }
    }
  } catch {
    // Continue to next tier
  }

  // 2. Try direct GPSwox request (if proxy or non-browser allows)
  const params = {
    device_id: deviceId,
    from_date: fromParts.date,
    from_time: fromParts.time,
    to_date: toParts.date,
    to_time: toParts.time
  };
  const endpoints = ["/history", "/get_history"];
  for (const endpoint of endpoints) {
    try {
      const payload = await request(endpoint, params);
      const rows = pickArray(payload).flatMap((item) => {
        if (Array.isArray(item?.items)) return item.items;
        return [item];
      });
      const records = rows.map((item) => ({
        lat: parseNumber(item.lat ?? item.latitude),
        lng: parseNumber(item.lng ?? item.longitude),
        timestamp: Number(item.timestamp ?? new Date(item.time || item.raw_time || item.show || item.date || Date.now()).getTime()),
        speed: parseNumber(item.speed ?? item.current_speed)
      })).filter(
        (record) => Number.isFinite(record.lat) && Number.isFinite(record.lng) && (record.lat !== 0 || record.lng !== 0)
      );
      if (records.length >= 2) {
        return records;
      }
    } catch {
      // Continue to next tier
    }
  }

  // 3. Fallback: Parse high-precision breadcrumb positions from deviceContext
  if (deviceContext) {
    const pts = parseDevicePositions(deviceContext, from, to);
    if (pts.length >= 2) return pts;
  }

  // 4. Fallback: Lookup in local Supabase cache
  try {
    const devices = await getDevicesFromSupabaseCache();
    const matched = devices.find(
      (d) => String(d.id) === String(deviceId) || d.plate === deviceId || d.name === deviceId || d.imei === deviceId
    );
    if (matched) {
      const pts = parseDevicePositions(matched, from, to);
      if (pts.length >= 2) return pts;
    }
  } catch {
    // Continue
  }

  // 5. Fallback: Check trackingRepository
  try {
    const localPositions = await trackingRepository.getPositions(deviceId);
    if (localPositions.length >= 2) {
      return localPositions.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        timestamp: p.timestamp,
        speed: p.speed || 0
      }));
    }
  } catch {
    // Continue
  }

  return [];
}

async function getEvents(): Promise<GpswoxEvent[]> {
  try {
    const sb = getSupabaseClient();
    if (sb) {
      const { data, error } = await sb.functions.invoke("gpswox", {
        body: { target: "alerts" },
        method: "POST"
      });
      if (error) {
        throw error;
      }
      if (data?.data) {
        const events = pickArray(data.data).map(parseEvent);
        if (events.length) {
          await saveGpsSnapshot("events", events as any);
        }
        return events;
      }
      if (data?.ok === false && data?.error) {
        throw new Error(data.error);
      }
    } else {
      const payload = await requestViaSupabaseFunction("alerts");
      if (payload?.data) {
        const events = pickArray(payload.data).map(parseEvent);
        if (events.length) {
          await saveGpsSnapshot("events", events as any);
        }
        return events;
      }
    }
  } catch {
  }
  const endpoints = ["/get_events", "/events", "/alerts"];
  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const payload = await request(endpoint);
      const events = pickArray(payload).map(parseEvent);
      if (events.length) {
        await saveGpsSnapshot("events", events as any);
      }
      return events;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    const cached = await getEventsFromSupabaseCache();
    if (cached.length) return cached;
    throw lastError;
  }
  return getEventsFromSupabaseCache();
}

async function getFuelRecords(): Promise<GpswoxFuelRecord[]> {
  try {
    const payload = await requestViaSupabaseFunction("reports");
    if (payload?.data) {
      const records = pickArray(payload.data).map(parseFuel).filter((item) => item.quantity > 0);
      if (records.length) {
        await saveGpsSnapshot("fuel", records as any);
      }
      return records;
    }
  } catch {
  }
  const endpoints = ["/fuel", "/get_fuel", "/fuel_fillings"];
  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const payload = await request(endpoint);
      const records = pickArray(payload).map(parseFuel).filter((item) => item.quantity > 0);
      if (records.length) {
        await saveGpsSnapshot("fuel", records as any);
      }
      return records;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    const cached = await getFuelFromSupabaseCache();
    if (cached.length) return cached;
    throw lastError;
  }
  return getFuelFromSupabaseCache();
}

async function syncFuelToLocalStorage(records: GpswoxFuelRecord[]) {
  if (!records.length) return;
  const vehicles = await vehiclesRepository.listVehicles();
  for (const record of records) {
    const linked = vehicles.find(
      (vehicle) =>
        vehicle.registration === record.deviceId ||
        vehicle.immatriculation === record.deviceId ||
        vehicle.id === record.deviceId
    );
    if (!linked) continue;
    await fuelService.add({
      vehicleId: linked.id,
      quantity: record.quantity,
      price: record.price || 0,
      station: record.station,
      date: record.date
    });
  }
}

async function getAnalytics(): Promise<GpswoxAnalytics> {
  const devices = await getDevices();
  if (!devices.length) {
    return { totalDevices: 0, onlineDevices: 0, offlineDevices: 0, averageSpeed: 0 };
  }
  const onlineDevices = devices.filter((device) => device.online).length;
  const avgSpeed = devices.reduce((sum, device) => sum + (device.speed || 0), 0) / devices.length;
  return {
    totalDevices: devices.length,
    onlineDevices,
    offlineDevices: devices.length - onlineDevices,
    averageSpeed: Math.round(avgSpeed)
  };
}

async function refreshAll() {
  const [devices, events, fuel] = await Promise.all([getDevices(), getEvents(), getFuelRecords()]);
  await syncFuelToLocalStorage(fuel);
  return { devices, events, fuel };
}

export const gpswoxService = {
  getDevices,
  getDeviceHistory,
  getEvents,
  getFuelRecords,
  getAnalytics,
  refreshAll
};
