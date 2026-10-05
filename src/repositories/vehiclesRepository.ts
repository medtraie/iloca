import { getSupabaseClient, getSupabaseConfigError } from "@/services/supabaseService";
import type { Vehicle } from "@/types/appData";

type VehicleRow = Record<string, any>;

const STORAGE_KEY_LOCAL_VEHICLES = "iloca:vehicles:local";

const requireSupabase = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error(getSupabaseConfigError() || "Supabase non configure.");
  }
  return supabase;
};

const normalizeArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
};

const normalizeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapVehicleRow = (row: VehicleRow): Vehicle => ({
  id: String(row.id),
  brand: String(row.brand || row.marque || ""),
  model: row.model || row.modele || undefined,
  registration: row.registration || row.immatriculation || undefined,
  year: normalizeNumber(row.year ?? row.annee),
  marque: String(row.brand || row.marque || ""),
  modele: row.model || row.modele || undefined,
  immatriculation: row.registration || row.immatriculation || undefined,
  annee: normalizeNumber(row.year ?? row.annee),
  type_carburant: row.fuel_type || row.type_carburant || undefined,
  boite_vitesse: row.gearbox || row.boite_vitesse || undefined,
  kilometrage: normalizeNumber(row.mileage ?? row.kilometrage),
  couleur: row.color || row.couleur || undefined,
  prix_par_jour: normalizeNumber(row.daily_rate ?? row.prix_par_jour),
  etat_vehicule: row.status || row.etat_vehicule || "disponible",
  km_depart: normalizeNumber(row.departure_mileage ?? row.km_depart),
  has_gps: Boolean(row.has_gps ?? row.gps_installed),
  documents: normalizeArray(row.documents_urls || row.documents),
  photos: normalizeArray(row.photos_urls || row.photos),
  created_at: String(row.created_at || new Date().toISOString()),
  updated_at: String(row.updated_at || new Date().toISOString()),
});

const buildVehicleInsertPayload = (vehicle: Partial<Vehicle>) => ({
  brand: (vehicle.marque || vehicle.brand || "").trim(),
  model: vehicle.modele?.trim() || vehicle.model?.trim() || null,
  registration: vehicle.immatriculation?.trim() || vehicle.registration?.trim() || null,
  year: vehicle.annee ?? vehicle.year ?? null,
  fuel_type: vehicle.type_carburant?.trim() || null,
  gearbox: vehicle.boite_vitesse?.trim() || null,
  mileage: vehicle.kilometrage ?? null,
  color: vehicle.couleur?.trim() || null,
  daily_rate: vehicle.prix_par_jour ?? null,
  status: vehicle.etat_vehicule?.trim() || "disponible",
  departure_mileage: vehicle.km_depart ?? null,
  has_gps: vehicle.has_gps ?? false,
  documents_urls: vehicle.documents || [],
  photos_urls: vehicle.photos || [],
});

const buildVehicleUpdatePayload = (vehicle: Partial<Vehicle>) => {
  const payload: Record<string, any> = {};

  const brand = vehicle.marque ?? vehicle.brand;
  if (brand !== undefined) payload.brand = String(brand).trim();

  const model = vehicle.modele ?? vehicle.model;
  if (model !== undefined) payload.model = model ? String(model).trim() : null;

  const registration = vehicle.immatriculation ?? vehicle.registration;
  if (registration !== undefined) payload.registration = registration ? String(registration).trim() : null;

  const year = vehicle.annee ?? vehicle.year;
  if (year !== undefined) payload.year = year;

  if (vehicle.type_carburant !== undefined) payload.fuel_type = vehicle.type_carburant ? String(vehicle.type_carburant).trim() : null;
  if (vehicle.boite_vitesse !== undefined) payload.gearbox = vehicle.boite_vitesse ? String(vehicle.boite_vitesse).trim() : null;
  if (vehicle.kilometrage !== undefined) payload.mileage = vehicle.kilometrage;
  if (vehicle.couleur !== undefined) payload.color = vehicle.couleur ? String(vehicle.couleur).trim() : null;
  if (vehicle.prix_par_jour !== undefined) payload.daily_rate = vehicle.prix_par_jour;
  if (vehicle.etat_vehicule !== undefined) payload.status = vehicle.etat_vehicule ? String(vehicle.etat_vehicule).trim() : "disponible";
  if (vehicle.km_depart !== undefined) payload.departure_mileage = vehicle.km_depart;
  if (vehicle.has_gps !== undefined) payload.has_gps = vehicle.has_gps;
  if (vehicle.documents !== undefined) payload.documents_urls = vehicle.documents;
  if (vehicle.photos !== undefined) payload.photos_urls = vehicle.photos;

  return payload;
};

function getLocalVehicles(): Vehicle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_VEHICLES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalVehicles(vehicles: Vehicle[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_VEHICLES, JSON.stringify(vehicles));
  } catch (e) {
    console.warn("Could not save local vehicles:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

async function listVehicles(): Promise<Vehicle[]> {
  const localList = getLocalVehicles();
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase.from("vehicles").select("*").order("updated_at", { ascending: false });
    if (!error && data) {
      const remoteVehicles = data.map(mapVehicleRow);
      const remoteIds = new Set(remoteVehicles.map((v) => v.id));
      const combined = [...remoteVehicles, ...localList.filter((v) => !remoteIds.has(v.id))];
      saveLocalVehicles(combined);
      return combined;
    }
  } catch (err) {
    console.warn("Error loading vehicles from Supabase, using local cache:", err);
  }
  return localList;
}

async function createVehicle(input: Omit<Vehicle, "id" | "created_at" | "updated_at">): Promise<Vehicle> {
  const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
  let activeUserId: string | null = null;
  if (activeUserStr) {
    try {
      activeUserId = JSON.parse(activeUserStr)?.id || null;
    } catch {}
  }

  const now = new Date().toISOString();
  const fallbackVehicle: Vehicle = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `veh-${Date.now()}`,
    brand: (input.marque || input.brand || "").trim(),
    model: input.modele?.trim() || input.model?.trim(),
    registration: input.immatriculation?.trim() || input.registration?.trim(),
    year: input.annee ?? input.year,
    marque: (input.marque || input.brand || "").trim(),
    modele: input.modele?.trim() || input.model?.trim(),
    immatriculation: input.immatriculation?.trim() || input.registration?.trim(),
    annee: input.annee ?? input.year,
    type_carburant: input.type_carburant?.trim(),
    boite_vitesse: input.boite_vitesse?.trim(),
    kilometrage: input.kilometrage,
    couleur: input.couleur?.trim(),
    prix_par_jour: input.prix_par_jour,
    etat_vehicule: input.etat_vehicule?.trim() || "disponible",
    km_depart: input.km_depart,
    documents: input.documents || [],
    photos: input.photos || [],
    created_at: now,
    updated_at: now,
  };

  try {
    const supabase = requireSupabase();
    const { data: authData } = await supabase.auth.getUser();
    const candidateUserId = authData.user?.id || activeUserId;
    const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

    const insertPayload: Record<string, any> = {
      ...buildVehicleInsertPayload(input),
    };
    if (userId) {
      insertPayload.user_id = userId;
    }

    const { data, error } = await supabase.from("vehicles").insert(insertPayload).select("*").single();
    if (!error && data) {
      const saved = mapVehicleRow(data);
      const local = getLocalVehicles().filter((v) => v.id !== saved.id);
      saveLocalVehicles([saved, ...local]);
      return saved;
    }
    if (error) {
      console.warn("Supabase vehicle insert rejected (storing locally):", error);
    }
  } catch (err) {
    console.warn("Supabase vehicle creation exception (storing locally):", err);
  }

  // Fallback storage
  const currentLocal = getLocalVehicles().filter((v) => v.id !== fallbackVehicle.id);
  saveLocalVehicles([fallbackVehicle, ...currentLocal]);
  return fallbackVehicle;
}

async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  let updatedVehicle: Vehicle | null = null;
  try {
    const supabase = requireSupabase();
    const payload = buildVehicleUpdatePayload(updates);
    const { data, error } = await supabase
      .from("vehicles")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (!error && data) {
      updatedVehicle = mapVehicleRow(data);
    }
  } catch (err) {
    console.warn("Supabase vehicle update exception:", err);
  }

  const local = getLocalVehicles();
  const existing = local.find((v) => v.id === id);
  const now = new Date().toISOString();
  const merged: Vehicle = updatedVehicle || {
    ...(existing || { id, brand: "", marque: "", created_at: now, updated_at: now }),
    ...updates,
    updated_at: now,
  };

  const nextLocal = local.map((v) => (v.id === id ? merged : v));
  if (!existing && !updatedVehicle) {
    nextLocal.push(merged);
  }
  saveLocalVehicles(nextLocal);
  return merged;
}

async function deleteVehicle(id: string): Promise<void> {
  try {
    const supabase = requireSupabase();
    await supabase.from("vehicles").delete().eq("id", id);
  } catch (err) {
    console.warn("Supabase vehicle delete exception:", err);
  }
  const local = getLocalVehicles().filter((v) => v.id !== id);
  saveLocalVehicles(local);
}

async function replaceVehicles(vehicles: Vehicle[]): Promise<void> {
  saveLocalVehicles(vehicles);
  try {
    const supabase = requireSupabase();
    const { error: deleteError } = await supabase.from("vehicles").delete().not("id", "is", null);
    if (deleteError) return;
    if (!vehicles.length) return;
    const payload = vehicles.map((vehicle) => ({
      id: vehicle.id,
      ...buildVehicleInsertPayload(vehicle),
      created_at: vehicle.created_at,
      updated_at: vehicle.updated_at,
    }));
    await supabase.from("vehicles").insert(payload);
  } catch (err) {
    console.warn("Supabase replaceVehicles exception:", err);
  }
}

async function clearVehicles(): Promise<void> {
  saveLocalVehicles([]);
  try {
    const supabase = requireSupabase();
    await supabase.from("vehicles").delete().not("id", "is", null);
  } catch (err) {
    console.warn("Supabase clearVehicles exception:", err);
  }
}

export const vehiclesRepository = {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  replaceVehicles,
  clearVehicles,
};
