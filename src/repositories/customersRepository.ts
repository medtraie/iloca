import { getSupabaseClient, getSupabaseConfigError } from "@/services/supabaseService";
import type { ClientProfile, Customer, Tenant } from "@/types/appData";

type ClientRow = Record<string, any>;

const requireSupabase = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error(getSupabaseConfigError() || "Supabase non configure.");
  }
  return supabase;
};

const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asOptionalString = (value: unknown) => {
  const normalized = asString(value).trim();
  return normalized || undefined;
};

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
};

const toClientProfile = (row: ClientRow): ClientProfile => ({
  id: String(row.id),
  last_name: asString(row.last_name),
  first_name: asOptionalString(row.first_name),
  address_morocco: asOptionalString(row.address_morocco),
  phone: asOptionalString(row.phone),
  address_foreign: asOptionalString(row.address_foreign),
  cin: asOptionalString(row.cin),
  cin_delivered: asOptionalString(row.cin_delivered),
  license_number: asOptionalString(row.license_number),
  license_delivered: asOptionalString(row.license_delivered),
  passport_number: asOptionalString(row.passport_number),
  passport_delivered: asOptionalString(row.passport_delivered),
  birth_date: asOptionalString(row.birth_date),
  email: asOptionalString(row.email),
  nationality: asOptionalString(row.nationality),
  customer_type: row.customer_type === "Chauffeur secondaire" ? "Chauffeur secondaire" : "Locataire Principal",
  cin_image_url: asOptionalString(row.cin_image_url),
  license_image_url: asOptionalString(row.license_image_url),
  passport_image_url: asOptionalString(row.passport_image_url),
  avatar_url: asOptionalString(row.avatar_url),
  documents_urls: asStringArray(row.documents_urls),
  created_at: asString(row.created_at) || new Date().toISOString(),
  updated_at: asString(row.updated_at) || new Date().toISOString(),
});

const toCustomer = (profile: ClientProfile): Customer => ({
  id: profile.id,
  last_name: profile.last_name,
  first_name: profile.first_name,
  address_morocco: profile.address_morocco,
  phone: profile.phone,
  address_foreign: profile.address_foreign,
  cin: profile.cin,
  cin_delivered: profile.cin_delivered,
  license_number: profile.license_number,
  license_delivered: profile.license_delivered,
  passport_number: profile.passport_number,
  passport_delivered: profile.passport_delivered,
  birth_date: profile.birth_date,
  created_at: profile.created_at,
  updated_at: profile.updated_at,
});

const toTenant = (profile: ClientProfile): Tenant => ({
  id: profile.id,
  nom: profile.last_name,
  prenom: profile.first_name || "",
  adresse: profile.address_morocco || profile.address_foreign || "",
  telephone: profile.phone || "",
  cin: profile.cin || "",
  dateCin: profile.cin_delivered || "",
  permis: profile.license_number || "",
  datePermis: profile.license_delivered || "",
  dateNaissance: profile.birth_date || "",
  passeport: profile.passport_number,
  nationalite: profile.nationality || "Marocaine",
  type: profile.customer_type || "Locataire Principal",
  createdAt: profile.created_at,
  updatedAt: profile.updated_at,
  cinImageUrl: profile.cin_image_url,
  permisImageUrl: profile.license_image_url,
  passeportImageUrl: profile.passport_image_url,
  tenantImageUrl: profile.avatar_url,
});

const buildCustomerPayload = (input: Omit<Customer, "id" | "created_at" | "updated_at"> | Partial<Customer>) => ({
  last_name: asString(input.last_name),
  first_name: input.first_name?.trim() || null,
  address_morocco: input.address_morocco?.trim() || null,
  phone: input.phone?.trim() || null,
  address_foreign: input.address_foreign?.trim() || null,
  cin: input.cin?.trim() || null,
  cin_delivered: input.cin_delivered?.trim() || null,
  license_number: input.license_number?.trim() || null,
  license_delivered: input.license_delivered?.trim() || null,
  passport_number: input.passport_number?.trim() || null,
  passport_delivered: input.passport_delivered?.trim() || null,
  birth_date: input.birth_date?.trim() || null,
});

const buildTenantPayload = (input: Omit<Tenant, "id" | "createdAt" | "updatedAt"> | Partial<Tenant>) => ({
  last_name: asString(input.nom),
  first_name: input.prenom?.trim() || null,
  address_morocco: input.adresse?.trim() || null,
  phone: input.telephone?.trim() || null,
  cin: input.cin?.trim() || null,
  cin_delivered: input.dateCin?.trim() || null,
  license_number: input.permis?.trim() || null,
  license_delivered: input.datePermis?.trim() || null,
  birth_date: input.dateNaissance?.trim() || null,
  passport_number: input.passeport?.trim() || null,
  nationality: input.nationalite?.trim() || "Marocaine",
  customer_type: input.type || "Locataire Principal",
  cin_image_url: input.cinImageUrl?.trim() || null,
  license_image_url: input.permisImageUrl?.trim() || null,
  passport_image_url: input.passeportImageUrl?.trim() || null,
  avatar_url: input.tenantImageUrl?.trim() || null,
});

async function listClientProfiles(): Promise<ClientProfile[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from("clients").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(toClientProfile);
}

async function listCustomers(): Promise<Customer[]> {
  const profiles = await listClientProfiles();
  return profiles.map(toCustomer);
}

async function createCustomer(input: Omit<Customer, "id" | "created_at" | "updated_at">): Promise<Customer> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from("clients").insert(buildCustomerPayload(input)).select("*").single();
  if (error) throw error;
  return toCustomer(toClientProfile(data));
}

async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("clients")
    .update(buildCustomerPayload(updates))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return toCustomer(toClientProfile(data));
}

async function deleteCustomer(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

async function listTenants(): Promise<Tenant[]> {
  const profiles = await listClientProfiles();
  return profiles.map(toTenant);
}

async function createTenant(input: Omit<Tenant, "id" | "createdAt" | "updatedAt">): Promise<Tenant> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from("clients").insert(buildTenantPayload(input)).select("*").single();
  if (error) throw error;
  return toTenant(toClientProfile(data));
}

async function updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("clients")
    .update(buildTenantPayload(updates))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return toTenant(toClientProfile(data));
}

async function deleteTenant(id: string): Promise<void> {
  return deleteCustomer(id);
}

async function replaceClientProfiles(profiles: ClientProfile[]): Promise<void> {
  const supabase = requireSupabase();
  const { error: deleteError } = await supabase.from("clients").delete().not("id", "is", null);
  if (deleteError) throw deleteError;
  if (!profiles.length) return;
  const payload = profiles.map((profile) => ({
    id: profile.id,
    last_name: profile.last_name,
    first_name: profile.first_name || null,
    address_morocco: profile.address_morocco || null,
    phone: profile.phone || null,
    address_foreign: profile.address_foreign || null,
    cin: profile.cin || null,
    cin_delivered: profile.cin_delivered || null,
    license_number: profile.license_number || null,
    license_delivered: profile.license_delivered || null,
    passport_number: profile.passport_number || null,
    passport_delivered: profile.passport_delivered || null,
    birth_date: profile.birth_date || null,
    email: profile.email || null,
    nationality: profile.nationality || null,
    customer_type: profile.customer_type || "Locataire Principal",
    cin_image_url: profile.cin_image_url || null,
    license_image_url: profile.license_image_url || null,
    passport_image_url: profile.passport_image_url || null,
    avatar_url: profile.avatar_url || null,
    documents_urls: profile.documents_urls || [],
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  }));
  const { error } = await supabase.from("clients").insert(payload);
  if (error) throw error;
}

async function clearClientProfiles(): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("clients").delete().not("id", "is", null);
  if (error) throw error;
}

export const customersRepository = {
  listClientProfiles,
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  replaceClientProfiles,
  clearClientProfiles,
};
