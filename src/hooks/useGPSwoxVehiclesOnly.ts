import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/services/supabaseService";

export interface GPSwoxDevice {
  id: string;
  name: string;
  plate: string;
  imei: string;
  brand: string;
  model: string;
  status: "online" | "moving" | "offline";
  online: boolean;
  ignition: boolean;
  lat: number;
  lng: number;
  speed: number;
  fuelLevel?: number;
  battery: number;
  mileage: number;
  distanceToday: number;
  lastUpdate?: string;
  lastPosition: {
    lat: number;
    lng: number;
    speed: number;
    timestamp: number;
    city: string;
  };
  raw?: any;
}

const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toStatus = (online: boolean, speed: number): "online" | "moving" | "offline" => {
  if (online && speed > 1) return "moving";
  if (online) return "online";
  return "offline";
};

const toBool = (v: any) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "1" || s === "true" || s === "on" || s === "online" || s === "moving";
  }
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

const normalizeDevice = (raw: any): GPSwoxDevice => {
  const lat = toNumber(
    raw?.lastPosition?.lat ?? raw?.lat ?? raw?.latitude ?? raw?.position?.lat ?? raw?.location?.lat ?? raw?.gps?.lat
  );
  const lng = toNumber(
    raw?.lastPosition?.lng ?? raw?.lng ?? raw?.longitude ?? raw?.position?.lng ?? raw?.location?.lng ?? raw?.gps?.lng
  );
  const speed = toNumber(raw?.lastPosition?.speed ?? raw?.speed ?? raw?.current_speed ?? raw?.attributes?.speed);
  const online = toBool(raw?.online ?? raw?.active ?? raw?.connection_status ?? raw?.motion ?? raw?.status);
  const timestamp = raw?.lastPosition?.timestamp
    ? Number(raw.lastPosition.timestamp)
    : raw?.time || raw?.last_update || raw?.server_time || raw?.updated_at || raw?.timestamp
      ? new Date(raw.time || raw.last_update || raw.server_time || raw.updated_at || raw.timestamp).getTime()
      : Date.now();
  const id = String(raw?.id ?? raw?.device_id ?? raw?.imei ?? raw?.uniqueId ?? raw?.uuid ?? raw?.plate ?? raw?.name ?? "unknown");
  const plate = String(raw?.plate_number ?? raw?.plate ?? raw?.registration ?? raw?.immatriculation ?? "");
  const name = String(raw?.name ?? raw?.device_name ?? raw?.title ?? raw?.object_name ?? plate || "GPS Device");
  const fuelLevelRaw = raw?.fuel_level ?? raw?.fuelLevel ?? raw?.fuelQuantity ?? raw?.attributes?.fuel_level;
  return {
    id,
    name,
    plate,
    imei: String(raw?.imei ?? raw?.device_id ?? id),
    brand: String(raw?.brand ?? ""),
    model: String(raw?.model ?? ""),
    status: toStatus(online, speed),
    online,
    ignition: toBool(raw?.ignition ?? raw?.engine ?? raw?.attributes?.ignition),
    lat,
    lng,
    speed,
    fuelLevel: fuelLevelRaw !== undefined && fuelLevelRaw !== null ? toNumber(fuelLevelRaw) : undefined,
    battery: toNumber(raw?.battery) || 100,
    mileage: toNumber(raw?.mileage),
    distanceToday: toNumber(raw?.distanceToday ?? raw?.distance_today),
    lastUpdate: raw?.time ?? raw?.last_update ?? raw?.server_time ?? raw?.updated_at ?? raw?.timestamp
      ? String(raw.time ?? raw.last_update ?? raw.server_time ?? raw.updated_at ?? raw.timestamp)
      : undefined,
    lastPosition: {
      lat,
      lng,
      speed,
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
      city: String(raw?.city ?? raw?.lastPosition?.city ?? "")
    },
    raw
  };
};

export function useGPSwoxVehiclesOnly(refetchInterval = 60000) {
  return useQuery<GPSwoxDevice[], Error>({
    queryKey: ["gpswox-vehicles-only"],
    refetchInterval,
    staleTime: 10000,
    retry: 2,
    queryFn: async () => {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.functions.invoke("gpswox", { body: {}, method: "POST" });
          if (!error && data?.ok && Array.isArray(data?.vehicles)) {
            return dedupe(data.vehicles.map(normalizeDevice));
          }
        } catch {
        }
      }
      const local = await import("@/services/gpswoxService");
      try {
        const items = await local.gpswoxService.getDevices();
        return dedupe(items.map(normalizeDevice));
      } catch {
        return [];
      }
    }
  });
}

function dedupe(items: GPSwoxDevice[]): GPSwoxDevice[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.imei || ""}|${item.plate || ""}|${item.name || ""}|${item.id || ""}`.toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export { pickArray };
