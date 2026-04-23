import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function normalizeApiUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const withoutTrailing = withProtocol.replace(/\/+$/, "");
  if (withoutTrailing.endsWith("/api")) return withoutTrailing;
  return `${withoutTrailing}/api`;
}

function parseHash(payload: any): string {
  return payload?.user_api_hash || payload?.api_hash || payload?.hash || payload?.data?.user_api_hash || "";
}

function pickArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.devices)) return payload.devices;
  if (Array.isArray(payload?.objects)) return payload.objects;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (payload && typeof payload === "object") {
    const values = Object.values(payload);
    const nestedArray = values.find((value) => Array.isArray(value));
    if (Array.isArray(nestedArray)) return nestedArray;
    const nestedObject = values.find((value) => value && typeof value === "object");
    if (nestedObject && typeof nestedObject === "object") {
      const nestedValues = Object.values(nestedObject as Record<string, unknown>);
      const nestedObjectArray = nestedValues.find((value) => Array.isArray(value));
      if (Array.isArray(nestedObjectArray)) return nestedObjectArray;
      // GPSwox قد يعيد objects كـ map {id: {...}, id2: {...}}
      if (nestedValues.every((value) => value && typeof value === "object")) {
        return nestedValues as any[];
      }
    }
    if (values.every((value) => value && typeof value === "object")) {
      return values as any[];
    }
  }
  return [];
}

function isDeviceLikeObject(value: any): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    "imei" in value ||
    "device_id" in value ||
    "uniqueId" in value ||
    "plate" in value ||
    "plate_number" in value ||
    "lat" in value ||
    "latitude" in value ||
    "lng" in value ||
    "longitude" in value ||
    "position" in value ||
    keys.includes("speed")
  );
}

function normalizeKey(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

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

    if (isDeviceLikeObject(node)) {
      devices.push(node);
    }
  }

  const seen = new Set<string>();
  return devices.filter((item) => {
    const key =
      normalizeKey(item?.imei) ||
      normalizeKey(item?.device_id) ||
      normalizeKey(item?.uniqueId) ||
      normalizeKey(item?.plate_number ?? item?.plate ?? item?.registration ?? item?.immatriculation) ||
      normalizeKey(item?.name);
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 15000,
  init?: { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string }
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: init?.method || "GET",
      headers: init?.headers,
      body: init?.body,
      signal: controller.signal
    });
    if (!response.ok) {
      let body = "";
      try { body = await response.text(); } catch { /* ignore */ }
      throw new Error(`HTTP_${response.status} URL_${new URL(url).pathname} BODY_${body.substring(0, 100)}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw lastError || new Error("RETRY_FAILED");
}

async function getUserApiHash(apiBase: string, email: string, pass: string) {
  const loginUrl = new URL(`${apiBase}/login`);
  loginUrl.searchParams.set("email", email);
  loginUrl.searchParams.set("password", pass);
  console.log("Attempting GPSwox login:", loginUrl.toString().replace(pass, "***"));
  let lastError: unknown = null;

  // 1) Try GET /login?email=...&password=...
  try {
    const payload = await retry(() => fetchWithTimeout(loginUrl.toString()));
    const hash = parseHash(payload);
    if (hash) return hash;
  } catch (error) {
    lastError = error;
  }

  // 2) Try POST /login (application/x-www-form-urlencoded)
  try {
    const payload = await retry(() =>
      fetchWithTimeout(`${apiBase}/login`, 15000, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(pass)}`
      })
    );
    const hash = parseHash(payload);
    if (hash) return hash;
  } catch (error) {
    lastError = error;
  }

  // 3) Try POST /login (application/json)
  try {
    const payload = await retry(() =>
      fetchWithTimeout(`${apiBase}/login`, 15000, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password: pass })
      })
    );
    const hash = parseHash(payload);
    if (hash) return hash;
  } catch (error) {
    lastError = error;
  }

  console.error("GPSwox login failed after GET/POST attempts");
  throw lastError || new Error("GPSWOX_MISSING_USER_API_HASH");
}

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

// تحويل الجهاز إلى صيغة الواجهة
function transformDevice(item: any) {
  const lat = parseNumber(item.lat ?? item.latitude ?? item.position?.lat ?? item.location?.lat);
  const lng = parseNumber(item.lng ?? item.longitude ?? item.position?.lng ?? item.location?.lng);
  const speed = parseNumber(item.speed ?? item.current_speed ?? item.attributes?.speed);
  const online = parseBool(item.online ?? item.active ?? item.status ?? item.connection_status ?? item.motion);
  const lastUpdate = item.time ?? item.last_update ?? item.server_time ?? item.updated_at ?? item.timestamp;
  const plate = String(item.plate_number ?? item.plate ?? item.registration ?? item.immatriculation ?? "");
  const id = String(item.id ?? item.device_id ?? item.imei ?? item.uniqueId ?? item.plate ?? item.name ?? "unknown");
  const name = String(item.name ?? item.device_name ?? item.title ?? item.object_name ?? "");
  
  const hasPosition = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  const normalizedOnline = online || (hasPosition && speed > 0);
  let status = "offline";
  if (normalizedOnline) status = speed > 1 ? "moving" : "online";

  return {
    id,
    name,
    plate,
    imei: String(item.imei || id),
    brand: item.brand || "",
    model: item.model || "",
    status,
    lastPosition: {
      lat,
      lng,
      speed,
      timestamp: lastUpdate ? new Date(lastUpdate).getTime() : Date.now(),
      city: item.city || ""
    },
    mileage: item.mileage || 0,
    fuelQuantity: parseNumber(item.fuel_level ?? item.fuelLevel ?? item.attributes?.fuel_level ?? 0),
    driver: item.driver || null,
    driverDetails: item.driver_details || null,
    battery: item.battery || 100,
    network: item.network || "GSM",
    distanceToday: item.distance_today || 0,
    sensors: item.sensors || [],
    raw: item
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    let target = url.searchParams.get("target") || "devices";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body && typeof body === "object" && (body as any).target) {
          target = String((body as any).target || "").trim() || target;
        }
      } catch {
      }
    }
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: settingsData, error: settingsError } = await sb
      .from("gpswox_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("gpswox_settings query error:", settingsError);
    }
    const api_url = settingsData?.api_url || Deno.env.get("GPSWOX_API_URL") || "";
    const email = settingsData?.email || Deno.env.get("GPSWOX_EMAIL") || "";
    const password = settingsData?.password || Deno.env.get("GPSWOX_PASSWORD") || "";
    
    if (!api_url || !email || !password) {
      return new Response(JSON.stringify({ ok: false, error: "GPSWOX_CREDENTIALS_MISSING" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const apiBase = normalizeApiUrl(api_url);
    const userApiHash = await getUserApiHash(apiBase, email, password);

    if (target === "alerts" || target === "reports") {
      const endpoints =
        target === "alerts"
          ? ["/get_events", "/events", "/alerts"]
          : ["/fuel", "/get_fuel", "/fuel_fillings"];

      let lastError = "";
      for (const endpoint of endpoints) {
        try {
          const endpointUrl = new URL(`${apiBase}${endpoint}`);
          endpointUrl.searchParams.set("user_api_hash", userApiHash);
          const payload = await retry(() => fetchWithTimeout(endpointUrl.toString()));
          const arr = pickArray(payload);
          if (arr.length) {
            return new Response(JSON.stringify({ ok: true, data: arr, target }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        } catch (error) {
          lastError = String(error);
        }
      }

      const message = lastError || "GPSWOX_NO_DATA_FOUND";
      return new Response(JSON.stringify({ ok: false, error: message, data: null, target }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let rawDevices: any[] = [];
    let lastError = "";
    
    // جلب الأجهزة
    const endpoints = ["/get_devices", "/devices", "/objects"];
    for (const endpoint of endpoints) {
      try {
        const endpointUrl = new URL(`${apiBase}${endpoint}`);
        endpointUrl.searchParams.set("user_api_hash", userApiHash);
        const payload = await retry(() => fetchWithTimeout(endpointUrl.toString()));
        rawDevices = extractDevicesStrict(payload);
        if (rawDevices.length) break;
      } catch (error) {
        lastError = String(error);
      }
    }

    const vehicles = rawDevices
      .map(transformDevice)
      .filter((d) => d.id && d.id !== "unknown")
      .filter((d) => d.name || d.plate || d.imei);

    // تحديث الكاش
    if (vehicles.length > 0) {
        await sb.from("gpswox_snapshots").insert({
            snapshot_type: "devices",
            payload: vehicles,
            source: "edge_function_v2"
        });
    }

    if (vehicles.length === 0) {
      const message = lastError || "GPSWOX_NO_DEVICES_FOUND";
      return new Response(JSON.stringify({ ok: false, error: message, vehicles: [], data: [], count: 0 }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, vehicles, data: vehicles, count: vehicles.length, lastError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
