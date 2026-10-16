import { useQuery } from "@tanstack/react-query";
import { getLatestSnapshotPayload, getSupabaseClient } from "@/services/supabaseService";
import { gpswoxService } from "@/services/gpswoxService";

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

export const toStatus = (raw: any): "online" | "moving" | "offline" => {
  const innerRaw = raw?.raw || raw;
  const speed = toNumber(
    raw?.lastPosition?.speed ??
    raw?.speed ??
    raw?.current_speed ??
    raw?.attributes?.speed ??
    innerRaw?.speed ??
    innerRaw?.current_speed
  );

  const onlineRaw = String(
    innerRaw?.online ??
    innerRaw?.status ??
    raw?.online ??
    raw?.status ??
    innerRaw?.connection_status ??
    ""
  ).toLowerCase().trim();

  const iconColor = String(
    innerRaw?.icon_color ??
    raw?.icon_color ??
    ""
  ).toLowerCase().trim();

  const timeRaw = String(
    innerRaw?.time ??
    raw?.time ??
    ""
  ).toLowerCase().trim();

  // 1. Explicit offline checks
  if (onlineRaw === "offline" || iconColor === "red" || timeRaw.includes("non connecté") || timeRaw.includes("disconnected")) {
    return "offline";
  }

  // 2. Explicit moving checks
  if (speed > 2 || onlineRaw === "moving" || iconColor === "green") {
    return "moving";
  }

  // 3. Stopped / Ack checks (GPSwox 'ack', 'engine', 'online' with speed <= 2, icon yellow)
  if (
    onlineRaw === "ack" ||
    onlineRaw === "stopped" ||
    onlineRaw === "engine" ||
    onlineRaw === "online" ||
    onlineRaw === "true" ||
    onlineRaw === "1" ||
    iconColor === "yellow" ||
    innerRaw?.online === true
  ) {
    return "online";
  }

  // 4. Coordinates validity fallback
  const lat = toNumber(raw?.lastPosition?.lat ?? raw?.lat ?? innerRaw?.lat);
  const lng = toNumber(raw?.lastPosition?.lng ?? raw?.lng ?? innerRaw?.lng);
  if (lat !== 0 && lng !== 0) {
    return speed > 2 ? "moving" : "online";
  }

  return "offline";
};

const normalizeVehicle = (raw: any): GPSwoxVehicle => {
  const innerRaw = raw?.raw || raw;
  const lat = toNumber(
    raw?.lastPosition?.lat ??
    raw?.lat ??
    raw?.latitude ??
    raw?.position?.lat ??
    raw?.location?.lat ??
    innerRaw?.lat ??
    innerRaw?.latitude
  );
  const lng = toNumber(
    raw?.lastPosition?.lng ??
    raw?.lng ??
    raw?.longitude ??
    raw?.position?.lng ??
    raw?.location?.lng ??
    innerRaw?.lng ??
    innerRaw?.longitude
  );
  const speed = toNumber(
    raw?.lastPosition?.speed ??
    raw?.speed ??
    raw?.current_speed ??
    raw?.attributes?.speed ??
    innerRaw?.speed
  );

  const timestamp = raw?.lastPosition?.timestamp
    ? Number(raw.lastPosition.timestamp)
    : innerRaw?.timestamp && Number(innerRaw.timestamp) > 0
      ? Number(innerRaw.timestamp) * (Number(innerRaw.timestamp) < 1e11 ? 1000 : 1)
      : innerRaw?.time || innerRaw?.last_update || innerRaw?.server_time || innerRaw?.updated_at
        ? new Date(innerRaw.time || innerRaw.last_update || innerRaw.server_time || innerRaw.updated_at).getTime()
        : Date.now();

  const id = String(innerRaw?.id ?? innerRaw?.device_id ?? innerRaw?.imei ?? innerRaw?.uniqueId ?? raw?.id ?? "unknown");
  const name = String(innerRaw?.name ?? innerRaw?.device_name ?? innerRaw?.title ?? raw?.name ?? "");
  const plateCandidate = String(innerRaw?.plate_number ?? innerRaw?.plate ?? innerRaw?.registration ?? innerRaw?.immatriculation ?? raw?.plate ?? "");
  const plate = plateCandidate || name;

  return {
    id,
    name,
    plate,
    imei: String(innerRaw?.imei ?? innerRaw?.device_id ?? id),
    brand: String(innerRaw?.brand ?? raw?.brand ?? ""),
    model: String(innerRaw?.model ?? raw?.model ?? ""),
    status: toStatus(raw),
    lastPosition: {
      lat,
      lng,
      speed,
      timestamp,
      city: String(innerRaw?.city ?? innerRaw?.lastPosition?.city ?? raw?.city ?? "")
    },
    mileage: toNumber(innerRaw?.mileage ?? raw?.mileage),
    fuelQuantity: toNumber(innerRaw?.fuelQuantity ?? innerRaw?.fuel_level ?? innerRaw?.fuelLevel ?? innerRaw?.attributes?.fuel_level ?? raw?.fuelQuantity),
    driver: innerRaw?.driver && innerRaw.driver !== "-" ? innerRaw.driver : raw?.driver && raw.driver !== "-" ? raw.driver : null,
    driverDetails: innerRaw?.driverDetails ?? innerRaw?.driver_details ?? innerRaw?.driver_data ?? raw?.driverDetails ?? null,
    battery: toNumber(innerRaw?.battery ?? raw?.battery) || 100,
    network: String(innerRaw?.network ?? innerRaw?.protocol ?? raw?.network ?? "GSM"),
    distanceToday: toNumber(innerRaw?.distanceToday ?? innerRaw?.distance_today ?? raw?.distanceToday),
    sensors: Array.isArray(innerRaw?.sensors) ? innerRaw.sensors : Array.isArray(raw?.sensors) ? raw.sensors : [],
    raw: innerRaw
  };
};

export function useGPSwoxVehicles(refetchInterval = 30000, _companyId?: string) {
  return useQuery<GPSwoxVehicle[], Error>({
    queryKey: ["gpswox-vehicles"],
    queryFn: async () => {
      // 1. First priority: invoke Supabase edge function
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.functions.invoke("gpswox", {
            body: {},
            method: "POST",
          });

          if (!error && data?.ok && Array.isArray(data?.vehicles) && data.vehicles.length > 0) {
            const seen = new Set<string>();
            return data.vehicles
              .map(normalizeVehicle)
              .filter((v) => {
                const key = `${v.id}|${v.imei || ""}|${v.plate || ""}|${v.name || ""}`.toLowerCase();
                if (!key) return false;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
          }
        } catch (error) {
          console.warn("Edge function invoke failed, trying direct gpswoxService client call:", error);
        }
      }

      // 2. Second priority: direct GPSwox client-side call via gpswoxService
      try {
        const devices = await gpswoxService.getDevices();
        if (devices && devices.length > 0) {
          const seen = new Set<string>();
          return devices
            .map((d) => normalizeVehicle({ ...d.raw, ...d }))
            .filter((v) => {
              const key = `${v.id}|${v.imei || ""}|${v.plate || ""}|${v.name || ""}`.toLowerCase();
              if (!key) return false;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
        }
      } catch (clientErr) {
        console.warn("Direct gpswoxService call failed:", clientErr);
      }

      // 3. Third priority: local snapshot / Supabase snapshot
      const cached = await getLatestSnapshotPayload("devices");
      if (cached && cached.length > 0) {
        const seen = new Set<string>();
        return cached
          .map((item) => normalizeVehicle(item))
          .filter((v) => {
            const key = `${v.id}|${v.imei || ""}|${v.plate || ""}|${v.name || ""}`.toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
      }

      return [];
    },
    refetchInterval,
    staleTime: 10000,
    retry: 2,
    enabled: true,
  });
}
