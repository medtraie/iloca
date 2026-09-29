import { getSupabaseClient, getSupabaseConfigError } from "@/services/supabaseService";
import type { ClientProfile, Customer, Tenant } from "@/types/appData";

type ClientRow = Record<string, any>;

const STORAGE_KEY_LOCAL_CLIENTS = "iloca:clients:local";

function getLocalClients(): ClientProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_CLIENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalClients(clients: ClientProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_CLIENTS, JSON.stringify(clients));
  } catch (e) {
    console.warn("Could not save local clients:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

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
  const localList = getLocalClients();
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase.from("clients").select("*").order("updated_at", { ascending: false });
    if (!error && data) {
      const remoteProfiles = data.map(toClientProfile);
      const remoteIds = new Set(remoteProfiles.map((p) => p.id));
      const combined = [...remoteProfiles, ...localList.filter((p) => !remoteIds.has(p.id))];
      saveLocalClients(combined);
      return combined;
    }
  } catch (err) {
    console.warn("Error loading clients from Supabase, using local cache:", err);
  }
  return localList;
}

async function listCustomers(): Promise<Customer[]> {
  const profiles = await listClientProfiles();
  return profiles.map(toCustomer);
}

async function createCustomer(input: Omit<Customer, "id" | "created_at" | "updated_at">): Promise<Customer> {
  const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
  let activeUserId: string | null = null;
  if (activeUserStr) {
    try {
      activeUserId = JSON.parse(activeUserStr)?.id || null;
    } catch {}
  }

  const now = new Date().toISOString();
  const fallbackProfile: ClientProfile = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `cli-${Date.now()}`,
    last_name: input.last_name || "",
    first_name: input.first_name,
    address_morocco: input.address_morocco,
    phone: input.phone,
    address_foreign: input.address_foreign,
    cin: input.cin,
    cin_delivered: input.cin_delivered,
    license_number: input.license_number,
    license_delivered: input.license_delivered,
    passport_number: input.passport_number,
    passport_delivered: input.passport_delivered,
    birth_date: input.birth_date,
    customer_type: "Locataire Principal",
    documents_urls: [],
    created_at: now,
    updated_at: now,
  };

  try {
    const supabase = requireSupabase();
    const { data: authData } = await supabase.auth.getUser();
    const candidateUserId = authData.user?.id || activeUserId;
    const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

    const payload: Record<string, any> = {
      ...buildCustomerPayload(input),
    };
    if (userId) {
      payload.user_id = userId;
    }

    const { data, error } = await supabase.from("clients").insert(payload).select("*").single();
    if (!error && data) {
      const saved = toClientProfile(data);
      const local = getLocalClients().filter((p) => p.id !== saved.id);
      saveLocalClients([saved, ...local]);
      return toCustomer(saved);
    }
    if (error) {
      console.warn("Supabase client insert rejected (storing locally):", error);
    }
  } catch (err) {
    console.warn("Supabase client create exception (storing locally):", err);
  }

  const currentLocal = getLocalClients().filter((p) => p.id !== fallbackProfile.id);
  saveLocalClients([fallbackProfile, ...currentLocal]);
  return toCustomer(fallbackProfile);
}

async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
  let updatedProfile: ClientProfile | null = null;
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase.from("clients").update(buildCustomerPayload(updates)).eq("id", id).select("*").single();
    if (!error && data) {
      updatedProfile = toClientProfile(data);
    }
  } catch (err) {
    console.warn("Supabase customer update exception:", err);
  }

  const local = getLocalClients();
  const existing = local.find((p) => p.id === id);
  const now = new Date().toISOString();
  const merged: ClientProfile = updatedProfile || {
    ...(existing || { id, last_name: "", created_at: now, updated_at: now }),
    ...buildCustomerPayload(updates),
    updated_at: now,
  };

  const nextLocal = local.map((p) => (p.id === id ? merged : p));
  if (!existing && !updatedProfile) {
    nextLocal.push(merged);
  }
  saveLocalClients(nextLocal);
  return toCustomer(merged);
}

async function deleteCustomer(id: string): Promise<void> {
  try {
    const supabase = requireSupabase();
    await supabase.from("clients").delete().eq("id", id);
  } catch (err) {
    console.warn("Supabase customer delete exception:", err);
  }
  const local = getLocalClients().filter((p) => p.id !== id);
  saveLocalClients(local);
}

async function listTenants(): Promise<Tenant[]> {
  const profiles = await listClientProfiles();
  return profiles.map(toTenant);
}

async function createTenant(input: Omit<Tenant, "id" | "createdAt" | "updatedAt">): Promise<Tenant> {
  const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
  let activeUserId: string | null = null;
  if (activeUserStr) {
    try {
      activeUserId = JSON.parse(activeUserStr)?.id || null;
    } catch {}
  }

  const now = new Date().toISOString();
  const fallbackProfile: ClientProfile = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tenant-${Date.now()}`,
    last_name: input.nom || "",
    first_name: input.prenom,
    address_morocco: input.adresse,
    phone: input.telephone,
    cin: input.cin,
    cin_delivered: input.dateCin,
    license_number: input.permis,
    license_delivered: input.datePermis,
    birth_date: input.dateNaissance,
    passport_number: input.passeport,
    nationality: input.nationalite || "Marocaine",
    customer_type: input.type || "Locataire Principal",
    cin_image_url: input.cinImageUrl,
    license_image_url: input.permisImageUrl,
    passport_image_url: input.passeportImageUrl,
    avatar_url: input.tenantImageUrl,
    documents_urls: [],
    created_at: now,
    updated_at: now,
  };

  try {
    const supabase = requireSupabase();
    const { data: authData } = await supabase.auth.getUser();
    const candidateUserId = authData.user?.id || activeUserId;
    const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

    const payload: Record<string, any> = {
      ...buildTenantPayload(input),
    };
    if (userId) {
      payload.user_id = userId;
    }

    const { data, error } = await supabase.from("clients").insert(payload).select("*").single();
    if (!error && data) {
      const saved = toClientProfile(data);
      const local = getLocalClients().filter((p) => p.id !== saved.id);
      saveLocalClients([saved, ...local]);
      return toTenant(saved);
    }
    if (error) {
      console.warn("Supabase tenant insert rejected (storing locally):", error);
    }
  } catch (err) {
    console.warn("Supabase tenant create exception (storing locally):", err);
  }

  const currentLocal = getLocalClients().filter((p) => p.id !== fallbackProfile.id);
  saveLocalClients([fallbackProfile, ...currentLocal]);
  return toTenant(fallbackProfile);
}

async function updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
  let updatedProfile: ClientProfile | null = null;
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("clients")
      .update(buildTenantPayload(updates))
      .eq("id", id)
      .select("*")
      .single();
    if (!error && data) {
      updatedProfile = toClientProfile(data);
    }
  } catch (err) {
    console.warn("Supabase tenant update exception:", err);
  }

  const local = getLocalClients();
  const existing = local.find((p) => p.id === id);
  const now = new Date().toISOString();
  const merged: ClientProfile = updatedProfile || {
    ...(existing || { id, last_name: "", created_at: now, updated_at: now }),
    ...buildTenantPayload(updates),
    updated_at: now,
  };

  const nextLocal = local.map((p) => (p.id === id ? merged : p));
  if (!existing && !updatedProfile) {
    nextLocal.push(merged);
  }
  saveLocalClients(nextLocal);
  return toTenant(merged);
}

async function deleteTenant(id: string): Promise<void> {
  return deleteCustomer(id);
}

async function replaceClientProfiles(profiles: ClientProfile[]): Promise<void> {
  saveLocalClients(profiles);
  try {
    const supabase = requireSupabase();
    const { error: deleteError } = await supabase.from("clients").delete().not("id", "is", null);
    if (deleteError) return;
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
    await supabase.from("clients").insert(payload);
  } catch (err) {
    console.warn("Supabase replaceClientProfiles exception:", err);
  }
}

async function clearClientProfiles(): Promise<void> {
  saveLocalClients([]);
  try {
    const supabase = requireSupabase();
    await supabase.from("clients").delete().not("id", "is", null);
  } catch (err) {
    console.warn("Supabase clearClientProfiles exception:", err);
  }
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
