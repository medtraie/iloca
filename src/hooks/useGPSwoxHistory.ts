import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/services/supabaseService";

export interface GPSHistoryPoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed: number;
  status: "online" | "moving" | "offline";
}

export function useGPSwoxHistory(vehicleId: string | null, snapshotLimit = 40) {
  return useQuery<GPSHistoryPoint[], Error>({
    queryKey: ["gpswox-history", vehicleId, snapshotLimit],
    enabled: Boolean(vehicleId),
    queryFn: async () => {
      const sb = getSupabaseClient();
      if (!sb || !vehicleId) return [];

      const { data, error } = await sb
        .from("gpswox_snapshots")
        .select("payload")
        .eq("snapshot_type", "devices")
        .order("id", { ascending: false })
        .limit(snapshotLimit);

      if (error) {
        throw new Error(error.message || "Failed to load GPS history");
      }

      const points: GPSHistoryPoint[] = [];

      for (const row of data || []) {
        const payload: any = (row as any).payload;
        const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
        if (!Array.isArray(items)) continue;
        const match = items.find((item: any) => String(item.id) === vehicleId);
        if (!match || !match.lastPosition) continue;
        const lat = Number(match.lastPosition.lat);
        const lng = Number(match.lastPosition.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const ts = match.lastPosition.timestamp ? Number(match.lastPosition.timestamp) : Date.now();
        const speed = Number(match.lastPosition.speed || 0);
        const status = (match.status || "offline") as "online" | "moving" | "offline";
        points.push({
          lat,
          lng,
          timestamp: Number.isFinite(ts) ? ts : Date.now(),
          speed: Number.isFinite(speed) ? speed : 0,
          status
        });
      }

      points.sort((a, b) => a.timestamp - b.timestamp);
      return points;
    }
  });
}

