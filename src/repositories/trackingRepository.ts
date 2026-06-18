import { getSupabaseClient } from "@/services/supabaseService";

export type Position = {
  timestamp: number;
  lat: number;
  lng: number;
  speed?: number;
};

export const trackingRepository = {
  async getPositions(vehicleId: string): Promise<Position[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tracking_positions")
      .select("timestamp, lat, lng, speed")
      .eq("vehicle_id", vehicleId)
      .order("timestamp", { ascending: true });
    
    if (error) {
      console.error("Failed to fetch tracking positions", error);
      return [];
    }
    return data as Position[];
  },

  async setPositions(vehicleId: string, positions: Position[]): Promise<void> {
    const supabase = getSupabaseClient();
    
    // First clear old positions
    await supabase.from("tracking_positions").delete().eq("vehicle_id", vehicleId);
    
    if (positions.length === 0) return;
    
    // Then insert new ones
    const payload = positions.map(p => ({
      vehicle_id: vehicleId,
      timestamp: p.timestamp,
      lat: p.lat,
      lng: p.lng,
      speed: p.speed || 0,
    }));
    
    const { error } = await supabase.from("tracking_positions").insert(payload);
    if (error) console.error("Failed to set tracking positions", error);
  },

  async addPosition(vehicleId: string, p: Position): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("tracking_positions").insert([{
      vehicle_id: vehicleId,
      timestamp: p.timestamp,
      lat: p.lat,
      lng: p.lng,
      speed: p.speed || 0,
    }]);
    if (error) console.error("Failed to add tracking position", error);
  },

  async clearPositions(vehicleId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("tracking_positions").delete().eq("vehicle_id", vehicleId);
    if (error) console.error("Failed to clear tracking positions", error);
  }
};
