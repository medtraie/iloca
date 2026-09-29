import { getSupabaseClient } from "@/services/supabaseService";
import { Repair } from "@/types/repair";

type RepairRow = Record<string, any>;

const readFirstDefined = <T = any>(row: RepairRow, keys: string[]): T | undefined => {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key] as T;
  }
  return undefined;
};

const mapRepairRow = (row: RepairRow): Repair => ({
  id: String(row.id),
  vehicleId: String(readFirstDefined(row, ["vehicleId", "vehicleid", "vehicle_id"]) || ""),
  vehicleInfo: (readFirstDefined(row, ["vehicleInfo", "vehicleinfo", "vehicle_info"]) || {}) as any,
  typeReparation: (readFirstDefined(row, ["typeReparation", "type_reparation", "typereparation"]) || "Mécanique") as any,
  cout: Number(readFirstDefined(row, ["cout", "cost"]) || 0),
  paye: Number(readFirstDefined(row, ["paye", "paid"]) || 0),
  dette: Number(readFirstDefined(row, ["dette", "debt"]) || 0),
  dateReparation: String(readFirstDefined(row, ["dateReparation", "date_reparation"]) || ""),
  paymentMethod: (readFirstDefined(row, ["paymentMethod", "payment_method"]) || "Espèces") as any,
  checkName: readFirstDefined(row, ["checkName", "check_name"]),
  checkReference: readFirstDefined(row, ["checkReference", "check_reference"]),
  checkDate: readFirstDefined(row, ["checkDate", "check_date"]),
  checkDepositDate: readFirstDefined(row, ["checkDepositDate", "check_deposit_date"]),
  pieceJointe: readFirstDefined(row, ["pieceJointe", "piece_jointe"]) as any,
  dueDate: readFirstDefined(row, ["dueDate", "due_date"]),
  slaTargetDays: readFirstDefined(row, ["slaTargetDays", "sla_target_days"]),
  operationalStatus: readFirstDefined(row, ["operationalStatus", "operational_status"]) as any,
  payments: (readFirstDefined(row, ["payments"]) || []) as any,
  updates: (readFirstDefined(row, ["updates"]) || []) as any,
  note: String(readFirstDefined(row, ["note"]) || ""),
  created_at: String(readFirstDefined(row, ["created_at"]) || new Date().toISOString()),
  updated_at: String(readFirstDefined(row, ["updated_at"]) || new Date().toISOString()),
});

const isMissingColumnError = (err: any) =>
  Boolean(err && typeof err === "object" && (err.code === "PGRST204" || /schema cache/i.test(String(err.message))));

const VEHICLE_ID_COLUMNS = ["vehicle_id", "vehicleid", "vehicleId"] as const;

const buildRepairPayload = (input: Partial<Repair>) => {
  const payload: Record<string, any> = {};

  if (input.vehicleInfo !== undefined) payload.vehicleInfo = input.vehicleInfo;
  if (input.typeReparation !== undefined) payload.typeReparation = input.typeReparation;
  if (input.cout !== undefined) payload.cout = input.cout;
  if (input.paye !== undefined) payload.paye = input.paye;
  if (input.dette !== undefined) payload.dette = input.dette;
  if (input.dateReparation !== undefined) payload.dateReparation = input.dateReparation;
  if (input.paymentMethod !== undefined) payload.paymentMethod = input.paymentMethod;
  if (input.checkName !== undefined) payload.checkName = input.checkName;
  if (input.checkReference !== undefined) payload.checkReference = input.checkReference;
  if (input.checkDate !== undefined) payload.checkDate = input.checkDate;
  if (input.checkDepositDate !== undefined) payload.checkDepositDate = input.checkDepositDate;
  if (input.pieceJointe !== undefined) payload.pieceJointe = input.pieceJointe;
  if (input.dueDate !== undefined) payload.dueDate = input.dueDate;
  if (input.slaTargetDays !== undefined) payload.slaTargetDays = input.slaTargetDays;
  if (input.operationalStatus !== undefined) payload.operationalStatus = input.operationalStatus;
  if (input.payments !== undefined) payload.payments = input.payments;
  if (input.updates !== undefined) payload.updates = input.updates;
  if (input.note !== undefined) payload.note = input.note;

  return payload;
};

const STORAGE_KEY_LOCAL_REPAIRS = "iloca:repairs:local";

function getLocalRepairs(): Repair[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_REPAIRS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRepairs(repairs: Repair[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_REPAIRS, JSON.stringify(repairs));
  } catch (e) {
    console.warn("Could not save local repairs:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const repairsRepository = {
  async getAll(): Promise<Repair[]> {
    const localList = getLocalRepairs();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("repairs").select("*").order("created_at", { ascending: false });
        if (!error && data) {
          const remoteList = (data || []).map(mapRepairRow);
          const remoteIds = new Set(remoteList.map((r) => r.id));
          const combined = [...remoteList, ...localList.filter((r) => !remoteIds.has(r.id))];
          saveLocalRepairs(combined);
          return combined;
        }
      }
    } catch (err) {
      console.warn("Error loading repairs:", err);
    }
    return localList;
  },

  async getById(id: string): Promise<Repair | null> {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("repairs").select("*").eq("id", id).single();
        if (!error && data) return mapRepairRow(data as RepairRow);
      }
    } catch (err) {
      console.warn("Error getting repair by ID:", err);
    }
    const local = getLocalRepairs();
    return local.find((r) => r.id === id) || null;
  },

  async getByVehicleId(vehicleId: string): Promise<Repair[]> {
    const all = await this.getAll();
    return all.filter((r) => r.vehicleId === vehicleId);
  },

  async create(repair: Omit<Repair, "id" | "created_at" | "updated_at">): Promise<Repair> {
    const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
    let activeUserId: string | null = null;
    if (activeUserStr) {
      try {
        activeUserId = JSON.parse(activeUserStr)?.id || null;
      } catch {}
    }

    const now = new Date().toISOString();
    const fallbackRepair: Repair = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `rep-${Date.now()}`,
      ...repair,
      created_at: now,
      updated_at: now,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        const candidateUserId = authData.user?.id || activeUserId;
        const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

        const basePayload: Record<string, any> = {
          ...buildRepairPayload(repair),
        };
        if (userId) basePayload.user_id = userId;

        for (const col of VEHICLE_ID_COLUMNS) {
          const payload = { ...basePayload, [col]: repair.vehicleId };
          const { data, error } = await supabase.from("repairs").insert([payload]).select("*").single();
          if (!error && data) {
            const saved = mapRepairRow(data as RepairRow);
            const local = getLocalRepairs().filter((r) => r.id !== saved.id);
            saveLocalRepairs([saved, ...local]);
            return saved;
          }
        }
      }
    } catch (err) {
      console.warn("Supabase repair create exception (storing locally):", err);
    }

    const currentLocal = getLocalRepairs().filter((r) => r.id !== fallbackRepair.id);
    saveLocalRepairs([fallbackRepair, ...currentLocal]);
    return fallbackRepair;
  },

  async update(id: string, updates: Partial<Repair>): Promise<Repair> {
    let updatedRepair: Repair | null = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const basePayload = buildRepairPayload(updates);
        if (updates.vehicleId === undefined) {
          const { data, error } = await supabase.from("repairs").update(basePayload).eq("id", id).select("*").single();
          if (!error && data) updatedRepair = mapRepairRow(data as RepairRow);
        } else {
          for (const col of VEHICLE_ID_COLUMNS) {
            const payload = { ...basePayload, [col]: updates.vehicleId };
            const { data, error } = await supabase.from("repairs").update(payload).eq("id", id).select("*").single();
            if (!error && data) {
              updatedRepair = mapRepairRow(data as RepairRow);
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn("Supabase repair update exception:", err);
    }

    const local = getLocalRepairs();
    const existing = local.find((r) => r.id === id);
    const now = new Date().toISOString();
    const merged: Repair = updatedRepair || {
      ...(existing || { id, vehicleId: "", cout: 0, paye: 0, dette: 0, dateReparation: now, created_at: now, updated_at: now }),
      ...updates,
      updated_at: now,
    };

    const nextLocal = local.map((r) => (r.id === id ? merged : r));
    if (!existing && !updatedRepair) nextLocal.push(merged);
    saveLocalRepairs(nextLocal);
    return merged;
  },

  async delete(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("repairs").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase repair delete exception:", err);
    }
    const local = getLocalRepairs().filter((r) => r.id !== id);
    saveLocalRepairs(local);
    return true;
  }
};

