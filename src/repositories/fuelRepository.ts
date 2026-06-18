import { getSupabaseClient } from "@/services/supabaseService";
import { FuelLog } from "@/services/fuelService";

export const fuelRepository = {
  async getAll(): Promise<FuelLog[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("fuel_logs").select("*").order("date", { ascending: false });
    if (error) throw error;
    
    // Map db columns back to frontend expected structure
    return data.map(log => ({
      id: log.id,
      vehicleId: log.vehicle_id,
      driver: log.driver,
      quantity: log.quantity,
      price: log.price,
      station: log.station,
      date: log.date,
      odometer: log.odometer,
    })) as FuelLog[];
  },

  async getByMonth(year: number, month: number): Promise<FuelLog[]> {
    const all = await this.getAll();
    return all.filter((l) => {
      const d = new Date(l.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  },

  async create(log: Omit<FuelLog, "id">): Promise<FuelLog> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("fuel_logs")
      .insert([{
        vehicle_id: log.vehicleId,
        driver: log.driver,
        quantity: log.quantity,
        price: log.price,
        station: log.station,
        date: log.date,
        odometer: log.odometer,
      }])
      .select()
      .single();
    if (error) throw error;
    
    return {
      id: data.id,
      vehicleId: data.vehicle_id,
      driver: data.driver,
      quantity: data.quantity,
      price: data.price,
      station: data.station,
      date: data.date,
      odometer: data.odometer,
    } as FuelLog;
  }
};
