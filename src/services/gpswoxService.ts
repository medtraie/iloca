import { localStorageService, Vehicle } from "@/services/localStorageService";
import { trackingService } from "@/services/trackingService";
import { fuelService } from "@/services/fuelService";
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
const DEFAULT_GPSWOX_EMAIL = "Medorarlis93@gmail.com";
const DEFAULT_GPSWOX_PASSWORD = "Tr198989";

const getBaseUrl = () =>
  (import.meta.env.VITE_GPSWOX_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_GPSWOX_URL as string | undefined) ||
  DEFAULT_GPSWOX_BASE_URL;

const getApiCandidates = () => {
  const envApi = (import.meta.env.VITE_GPSWOX_API_URL as string | undefined) || "";
  const envBaseApi = `${getBaseUrl().replace(/\/+$/, "")}/api`;
  const candidates = [envApi, DEFAULT_LOCAL_API_URL, envBaseApi, DEFAULT_GPSWOX_API_URL]
    .filter(Boolean)
    .map((value) => value.replace(/\/+$/, ""));
  return [...new Set(candidates)];
};

const getEmail = () =>
  (import.meta.env.VITE_GPSWOX_EMAIL as string | undefined) ||
  (import.meta.env.VITE_GPSWOX_USER as string | undefined) ||
  DEFAULT_GPSWOX_EMAIL;

const getPassword = () =>
  (import.meta.env.VITE_GPSWOX_PASSWORD as string | undefined) ||
  (import.meta.env.VITE_GPSWOX_MDPS as string | undefined) ||
  DEFAULT_GPSWOX_PASSWORD;

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

const readHashFromStorage = () => {
  const hash = localStorage.getItem(USER_HASH_KEY);
  const ts = Number(localStorage.getItem(USER_HASH_TS_KEY) || "0");
  if (!hash || !ts || Date.now() - ts > HASH_TTL_MS) return "";
  return hash;
};

const writeHashToStorage = (hash: string) => {
  localStorage.setItem(USER_HASH_KEY, hash);
  localStorage.setItem(USER_HASH_TS_KEY, String(Date.now()));
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

const parseDevice = (item: AnyRecord): GpswoxDevice => {
  const lat = parseNumber(item.lat ?? item.latitude ?? item.position?.lat ?? item.location?.lat);
  const lng = parseNumber(item.lng ?? item.longitude ?? item.position?.lng ?? item.location?.lng);
  const id = String(item.id ?? item.device_id ?? item.imei ?? item.uniqueId ?? item.uuid ?? crypto.randomUUID());
  const name = String(item.name ?? item.title ?? item.device_name ?? item.object_name ?? item.imei ?? "GPS Device");
  const plate = String(item.plate_number ?? item.plate ?? item.registration ?? item.immatriculation ?? "");
  const speed = parseNumber(item.speed ?? item.current_speed ?? item.attributes?.speed);
  const online = parseBool(item.online ?? item.active ?? item.status ?? item.connection_status ?? item.motion);
  const ignition = parseBool(item.ignition ?? item.engine ?? item.attributes?.ignition);
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
  const cached = readHashFromStorage();
  if (cached) return cached;

  const email = getEmail();
  const password = getPassword();
  if (!email || !password) return "";

  const apiCandidates = getApiCandidates();
  for (const base of apiCandidates) {
    const loginViaQuery = buildUrl(base, "/login", { email, password });
    try {
      const payload = await fetchJson(loginViaQuery);
      const hash = parseHash(payload);
      if (hash) {
        writeHashToStorage(hash);
        return hash;
      }
    } catch {
    }
  }

  for (const base of apiCandidates) {
    try {
      const loginEndpoint = `${base.replace(/\/+$/, "")}/login`;
      const res = await fetch(loginEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) continue;
      const payload = await res.json();
      const hash = parseHash(payload);
      if (hash) {
        writeHashToStorage(hash);
        return hash;
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
  for (const base of getApiCandidates()) {
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
  const sbUrl =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://wypifrsooooeejfckomg.supabase.co";
  const sbKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    "";
  if (!sbUrl) {
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
  syncDevicesInLocalStorage(devices);
  syncTrackingFromDevices(devices);
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

function syncDevicesInLocalStorage(devices: GpswoxDevice[]) {
  const vehicles = localStorageService.getAll<Vehicle>("vehicles");
  devices.forEach((device) => {
    const linked = vehicles.find(
      (vehicle) =>
        (vehicle.registration && vehicle.registration === device.plate) ||
        (vehicle.immatriculation && vehicle.immatriculation === device.plate)
    );
    if (!linked) {
      localStorageService.create<Vehicle>("vehicles", mapDeviceToVehicle(device));
      return;
    }
    localStorageService.update<Vehicle>("vehicles", linked.id, {
      etat_vehicule: device.online ? "loue" : "disponible",
      registration: linked.registration || device.plate,
      immatriculation: linked.immatriculation || device.plate
    } as Partial<Vehicle>);
  });
}

function syncTrackingFromDevices(devices: GpswoxDevice[]) {
  const vehicles = localStorageService.getAll<Vehicle>("vehicles");
  devices.forEach((device) => {
    if (!device.lat || !device.lng) return;
    const linked = vehicles.find(
      (vehicle) =>
        (vehicle.registration && vehicle.registration === device.plate) ||
        (vehicle.immatriculation && vehicle.immatriculation === device.plate)
    );
    if (!linked) return;
    trackingService.addPosition(linked.id, {
      lat: device.lat,
      lng: device.lng,
      speed: device.speed,
      timestamp: Date.now()
    });
  });
}

async function getDevices(): Promise<GpswoxDevice[]> {
  try {
    const payload = await requestViaSupabaseFunction("devices");
    if (payload?.data) {
      const devices = pickArray(payload.data).map(parseDevice).filter((d) => d.id);
      if (devices.length) {
        syncDevicesInLocalStorage(devices);
        syncTrackingFromDevices(devices);
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
      const devices = pickArray(payload).map(parseDevice).filter((d) => d.id);
      if (devices.length) {
        syncDevicesInLocalStorage(devices);
        syncTrackingFromDevices(devices);
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

async function getDeviceHistory(deviceId: string, from?: string, to?: string) {
  const params = { device_id: deviceId, from: from || "", to: to || "" };
  const endpoints = ["/history", "/get_history"];
  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const payload = await request(endpoint, params);
      const records = pickArray(payload).map((item) => ({
        lat: parseNumber(item.lat ?? item.latitude),
        lng: parseNumber(item.lng ?? item.longitude),
        timestamp: Number(item.timestamp ?? new Date(item.time || item.date || Date.now()).getTime()),
        speed: parseNumber(item.speed ?? item.current_speed)
      }));
      if (records.length) return records.filter((record) => record.lat && record.lng);
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    throw lastError;
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
  const vehicles = localStorageService.getAll<Vehicle>("vehicles");
  records.forEach((record) => {
    const linked = vehicles.find(
      (vehicle) =>
        vehicle.registration === record.deviceId ||
        vehicle.immatriculation === record.deviceId ||
        vehicle.id === record.deviceId
    );
    if (!linked) return;
    fuelService.add({
      vehicleId: linked.id,
      quantity: record.quantity,
      price: record.price || 0,
      station: record.station,
      date: record.date
    });
  });
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
