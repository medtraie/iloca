import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { getLatestSnapshotPayload } from "@/services/supabaseService";

// يجب التأكد من تهيئة supabase client للاتصال
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export interface GPSwoxVehicle {
  id: string;
  name?: string;
  plate: string;
  imei: string;
  brand: string;
  model: string;
  status: "online" | "moving" | "offline";
  lastPosition: {
    lat: number;
    lng: number;
    speed: number;
    timestamp: number;
    city: string;
  };
  mileage: number;
  fuelQuantity: number;
  driver: string | null;
  driverDetails: any;
  battery: number;
  network: string;
  distanceToday: number;
  sensors: any[];
  raw?: any;
}

const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toStatus = (raw: any): "online" | "moving" | "offline" => {
  const speed = toNumber(raw?.lastPosition?.speed ?? raw?.speed ?? raw?.current_speed ?? raw?.attributes?.speed);
  const onlineRaw = String(raw?.status ?? raw?.online ?? raw?.active ?? "").toLowerCase();
  const online = onlineRaw === "online" || onlineRaw === "true" || onlineRaw === "1" || raw?.online === true;
  if (online && speed > 1) return "moving";
  if (online) return "online";
  return "offline";
};

const normalizeVehicle = (raw: any): GPSwoxVehicle => {
  const lat = toNumber(raw?.lastPosition?.lat ?? raw?.lat ?? raw?.latitude ?? raw?.position?.lat ?? raw?.location?.lat);
  const lng = toNumber(raw?.lastPosition?.lng ?? raw?.lng ?? raw?.longitude ?? raw?.position?.lng ?? raw?.location?.lng);
  const speed = toNumber(raw?.lastPosition?.speed ?? raw?.speed ?? raw?.current_speed ?? raw?.attributes?.speed);
  const timestamp = raw?.lastPosition?.timestamp
    ? Number(raw.lastPosition.timestamp)
    : raw?.time || raw?.last_update || raw?.server_time || raw?.updated_at || raw?.timestamp
      ? new Date(raw.time || raw.last_update || raw.server_time || raw.updated_at || raw.timestamp).getTime()
      : Date.now();
  const id = String(raw?.id ?? raw?.device_id ?? raw?.imei ?? raw?.uniqueId ?? raw?.plate ?? raw?.name ?? "unknown");
  return {
    id,
    name: raw?.name ?? raw?.device_name ?? raw?.title ?? "",
    plate: String(raw?.plate ?? raw?.plate_number ?? raw?.registration ?? raw?.immatriculation ?? ""),
    imei: String(raw?.imei ?? raw?.device_id ?? id),
    brand: String(raw?.brand ?? ""),
    model: String(raw?.model ?? ""),
    status: toStatus(raw),
    lastPosition: {
      lat,
      lng,
      speed,
      timestamp,
      city: String(raw?.city ?? raw?.lastPosition?.city ?? "")
    },
    mileage: toNumber(raw?.mileage),
    fuelQuantity: toNumber(raw?.fuelQuantity ?? raw?.fuel_level ?? raw?.fuelLevel ?? raw?.attributes?.fuel_level),
    driver: raw?.driver ?? null,
    driverDetails: raw?.driverDetails ?? raw?.driver_details ?? null,
    battery: toNumber(raw?.battery) || 100,
    network: String(raw?.network ?? "GSM"),
    distanceToday: toNumber(raw?.distanceToday ?? raw?.distance_today),
    sensors: Array.isArray(raw?.sensors) ? raw.sensors : [],
    raw
  };
};

export function useGPSwoxVehicles(refetchInterval = 30000, _companyId?: string) {
  return useQuery<GPSwoxVehicle[], Error>({
    queryKey: ["gpswox-vehicles"],
    queryFn: async () => {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase credentials not configured");
      }
      try {
        const { data, error } = await supabase.functions.invoke("gpswox", {
          body: {},
          method: "POST",
          headers: supabaseKey
            ? {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
              }
            : undefined
        });

        if (error) {
          throw new Error(error.message || "Failed to fetch GPSwox data from Edge Function");
        }

        if (!data?.ok) {
          throw new Error(data?.error || "Edge Function returned an error");
        }

        if (Array.isArray(data?.vehicles)) {
          const seen = new Set<string>();
          return data.vehicles
            .map(normalizeVehicle)
            .filter((v) => {
              const key = `${v.imei || ""}|${v.plate || ""}|${v.name || ""}`.toLowerCase();
              if (!key) return false;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
        }
      } catch (error) {
        const cached = await getLatestSnapshotPayload("devices");
        if (cached && cached.length > 0) {
          const seen = new Set<string>();
          return cached
            .map((item) => normalizeVehicle(item))
            .filter((v) => {
              const key = `${v.imei || ""}|${v.plate || ""}|${v.name || ""}`.toLowerCase();
              if (!key) return false;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
        }
        throw error instanceof Error ? error : new Error("Failed to fetch GPSwox devices");
      }
      return [];
    },
    refetchInterval,
    staleTime: 10000,
    retry: 3,
    // يعمل دائماً حتى لو لم يكن هناك companyId (لأن الـ null يعني الإعدادات الافتراضية في الجدول)
    enabled: true,
  });
}
