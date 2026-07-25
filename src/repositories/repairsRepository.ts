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

export const repairsRepository = {
  async getAll(): Promise<Repair[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("repairs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRepairRow);
  },

  async getById(id: string): Promise<Repair | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("repairs").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw error;
    return data ? mapRepairRow(data as RepairRow) : null;
  },

  async getByVehicleId(vehicleId: string): Promise<Repair[]> {
    const supabase = getSupabaseClient();
    for (const col of VEHICLE_ID_COLUMNS) {
      const { data, error } = await supabase
        .from("repairs")
        .select("*")
        .eq(col, vehicleId)
        .order("created_at", { ascending: false });
      if (!error) return (data || []).map(mapRepairRow);
      if (!isMissingColumnError(error)) throw error;
    }
    return [];
  },

  async create(repair: Omit<Repair, "id" | "created_at" | "updated_at">): Promise<Repair> {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const basePayload = {
      ...buildRepairPayload(repair),
      user_id: user?.id,
    };

    for (const col of VEHICLE_ID_COLUMNS) {
      const payload = { ...basePayload, [col]: repair.vehicleId };
      const { data, error } = await supabase.from("repairs").insert([payload]).select("*").single();
      if (!error) return mapRepairRow(data as RepairRow);
      if (!isMissingColumnError(error)) throw error;
    }

    throw new Error("Impossible d'ajouter la réparation: colonne véhicule introuvable.");
  },

  async update(id: string, updates: Partial<Repair>): Promise<Repair> {
    const supabase = getSupabaseClient();
    const basePayload = buildRepairPayload(updates);

    if (updates.vehicleId === undefined) {
      const { data, error } = await supabase.from("repairs").update(basePayload).eq("id", id).select("*").single();
      if (error) throw error;
      return mapRepairRow(data as RepairRow);
    }

    for (const col of VEHICLE_ID_COLUMNS) {
      const payload = { ...basePayload, [col]: updates.vehicleId };
      const { data, error } = await supabase.from("repairs").update(payload).eq("id", id).select("*").single();
      if (!error) return mapRepairRow(data as RepairRow);
      if (!isMissingColumnError(error)) throw error;
    }

    throw new Error("Impossible de mettre à jour la réparation: colonne véhicule introuvable.");
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("repairs").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};
