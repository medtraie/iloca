import { getSupabaseClient } from "@/services/supabaseService";
import { FuelLog } from "@/services/fuelService";

const STORAGE_KEY_LOCAL_FUEL = "iloca:fuel_logs:local";

function getLocalFuel(): FuelLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_FUEL);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFuel(logs: FuelLog[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_FUEL, JSON.stringify(logs));
  } catch (e) {
    console.warn("Could not save local fuel logs:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const fuelRepository = {
  async getAll(): Promise<FuelLog[]> {
    const localList = getLocalFuel();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("fuel_logs").select("*").order("date", { ascending: false });
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

          const remoteIds = new Set(remoteList.map((f) => f.id));
          const combined = [...remoteList, ...localList.filter((f) => !remoteIds.has(f.id))];
          saveLocalFuel(combined);
          return combined;
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
    const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
    let activeUserId: string | null = null;
    if (activeUserStr) {
      try {
        activeUserId = JSON.parse(activeUserStr)?.id || null;
      } catch {}
    }

    const fallbackLog: FuelLog = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `fuel-${Date.now()}`,
      ...log,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        const candidateUserId = authData.user?.id || activeUserId;
        const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

        const payload: Record<string, any> = {
          vehicle_id: log.vehicleId,
          driver: log.driver,
          quantity: log.quantity,
          price: log.price,
          station: log.station,
          date: log.date,
          odometer: log.odometer,
        };
        if (userId) payload.user_id = userId;

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
          const local = getLocalFuel().filter((f) => f.id !== saved.id);
          saveLocalFuel([saved, ...local]);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase fuel log insert exception (storing locally):", err);
    }

    const currentLocal = getLocalFuel().filter((f) => f.id !== fallbackLog.id);
    saveLocalFuel([fallbackLog, ...currentLocal]);
    return fallbackLog;
  }
};

