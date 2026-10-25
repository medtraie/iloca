import { getSupabaseClient } from "@/services/supabaseService";
import { FuelLog } from "@/services/fuelService";
import {
  getActiveTenantUserId,
  isValidUuid,
  getScopedLocalStorage,
  saveScopedLocalStorage,
} from "./repositoryUtils";

const STORAGE_KEY_LOCAL_FUEL = "iloca:fuel_logs:local";

function getLocalFuel(userId?: string | null): FuelLog[] {
  return getScopedLocalStorage<FuelLog>(STORAGE_KEY_LOCAL_FUEL, userId);
}

function saveLocalFuel(logs: FuelLog[], userId?: string | null): void {
  saveScopedLocalStorage(STORAGE_KEY_LOCAL_FUEL, logs, userId);
}

export const fuelRepository = {
  async getAll(): Promise<FuelLog[]> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) return [];
    const localList = getLocalFuel(activeUserId);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("fuel_logs")
          .select("*")
          .eq("user_id", activeUserId)
          .order("date", { ascending: false });
        if (!error && data) {
          const remoteList = data.map(log => ({
            id: log.id,
            vehicleId: log.vehicle_id,
            driver: log.driver,
            quantity: log.quantity,
            price: log.price,
            station: log.station,
            date: log.date,
            odometer: log.odometer,
          })) as FuelLog[];

          saveLocalFuel(remoteList, activeUserId);
          return remoteList;
        }
      }
    } catch (err) {
      console.warn("Error loading fuel logs:", err);
    }
    return localList;
  },

  async getByMonth(year: number, month: number): Promise<FuelLog[]> {
    const all = await this.getAll();
    return all.filter((l) => {
      const d = new Date(l.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  },

  async create(log: Omit<FuelLog, "id">): Promise<FuelLog> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) {
      throw new Error("Action impossible: utilisateur non authentifié.");
    }

    const fallbackLog: FuelLog = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `fuel-${Date.now()}`,
      ...log,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const payload: Record<string, any> = {
          vehicle_id: log.vehicleId,
          driver: log.driver,
          quantity: log.quantity,
          price: log.price,
          station: log.station,
          date: log.date,
          odometer: log.odometer,
          user_id: activeUserId,
        };

        const { data, error } = await supabase
          .from("fuel_logs")
          .insert([payload])
          .select()
          .single();
        if (!error && data) {
          const saved: FuelLog = {
            id: data.id,
            vehicleId: data.vehicle_id,
            driver: data.driver,
            quantity: data.quantity,
            price: data.price,
            station: data.station,
            date: data.date,
            odometer: data.odometer,
          };
          const local = getLocalFuel(activeUserId).filter((f) => f.id !== saved.id);
          saveLocalFuel([saved, ...local], activeUserId);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase fuel log insert exception (storing locally):", err);
    }

    const currentLocal = getLocalFuel(activeUserId).filter((f) => f.id !== fallbackLog.id);
    saveLocalFuel([fallbackLog, ...currentLocal], activeUserId);
    return fallbackLog;
  }
};
