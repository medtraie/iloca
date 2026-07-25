import { getSupabaseClient, getSupabaseConfigError } from "@/services/supabaseService";
import type { Vehicle } from "@/types/appData";

type VehicleRow = Record<string, any>;

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
  brand: String(row.brand || ""),
  model: row.model || undefined,
  registration: row.registration || undefined,
  year: normalizeNumber(row.year),
  marque: String(row.brand || ""),
  modele: row.model || undefined,
  immatriculation: row.registration || undefined,
  annee: normalizeNumber(row.year),
  type_carburant: row.fuel_type || undefined,
  boite_vitesse: row.gearbox || undefined,
  kilometrage: normalizeNumber(row.mileage),
  couleur: row.color || undefined,
  prix_par_jour: normalizeNumber(row.daily_rate),
  etat_vehicule: row.status || "disponible",
  km_depart: normalizeNumber(row.departure_mileage),
  documents: normalizeArray(row.documents_urls),
  photos: normalizeArray(row.photos_urls),
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
  if (vehicle.documents !== undefined) payload.documents_urls = vehicle.documents;
  if (vehicle.photos !== undefined) payload.photos_urls = vehicle.photos;

  return payload;
};

async function listVehicles(): Promise<Vehicle[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from("vehicles").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapVehicleRow);
}

async function createVehicle(input: Omit<Vehicle, "id" | "created_at" | "updated_at">): Promise<Vehicle> {
  const supabase = requireSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    throw new Error("Session utilisateur introuvable. Reconnectez-vous puis reessayez.");
  }
  const payload = {
    ...buildVehicleInsertPayload(input),
    user_id: authData.user.id,
  };
  const { data, error } = await supabase.from("vehicles").insert(payload).select("*").single();
  if (error) throw error;
  return mapVehicleRow(data);
}

async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  const supabase = requireSupabase();
  const payload = buildVehicleUpdatePayload(updates);
  const { data, error } = await supabase
    .from("vehicles")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapVehicleRow(data);
}

async function deleteVehicle(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}

async function replaceVehicles(vehicles: Vehicle[]): Promise<void> {
  const supabase = requireSupabase();
  const { error: deleteError } = await supabase.from("vehicles").delete().not("id", "is", null);
  if (deleteError) throw deleteError;
  if (!vehicles.length) return;
  const payload = vehicles.map((vehicle) => ({
    id: vehicle.id,
    ...buildVehicleInsertPayload(vehicle),
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at,
  }));
  const { error } = await supabase.from("vehicles").insert(payload);
  if (error) throw error;
}

async function clearVehicles(): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("vehicles").delete().not("id", "is", null);
  if (error) throw error;
}

export const vehiclesRepository = {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  replaceVehicles,
  clearVehicles,
};
