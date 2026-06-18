import { getSupabaseClient, getSupabaseConfigError } from "@/services/supabaseService";
import type { AutoBackupFrequency, BackupPreferences, CompanySettings, GpsSettings } from "@/types/appData";
import { DEFAULT_BRAND_COLOR } from "@/utils/brandTheme";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const APP_SETTINGS_TABLE = "app_settings";

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: "",
  companyLogo: null,
  companyAddress: "",
  companyPhone: "",
  companyFax: "",
  companyGsm: "",
  companyEmail: "",
  brandColor: DEFAULT_BRAND_COLOR,
};

const DEFAULT_BACKUP_PREFERENCES: BackupPreferences = {
  autoBackupFrequency: "disabled",
  lastBackupDate: null,
  lastAutoBackupCheck: null,
};

const requireSupabase = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error(getSupabaseConfigError() || "Supabase non configure.");
  }
  return supabase;
};

const readString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const readNullableString = (value: unknown) => (typeof value === "string" ? value : null);

async function listAppSettings(): Promise<Record<string, JsonValue>> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from(APP_SETTINGS_TABLE).select("setting_key, setting_value");
  if (error) throw error;

  return (data || []).reduce<Record<string, JsonValue>>((acc, row: any) => {
    acc[String(row.setting_key)] = row.setting_value as JsonValue;
    return acc;
  }, {});
}

async function upsertAppSettings(values: Record<string, JsonValue>): Promise<void> {
  const entries = Object.entries(values);
  if (!entries.length) return;

  const supabase = requireSupabase();
  const payload = entries.map(([setting_key, setting_value]) => ({ setting_key, setting_value }));
  const { error } = await supabase.from(APP_SETTINGS_TABLE).upsert(payload, { onConflict: "user_id,setting_key" });
  if (error) throw error;
}

async function getCompanySettings(): Promise<CompanySettings> {
  const settings = await listAppSettings();
  return {
    companyName: readString(settings.companyName),
    companyLogo: readNullableString(settings.companyLogo),
    companyAddress: readString(settings.companyAddress),
    companyPhone: readString(settings.companyPhone),
    companyFax: readString(settings.companyFax),
    companyGsm: readString(settings.companyGsm),
    companyEmail: readString(settings.companyEmail),
    brandColor: readString(settings.brandColor, DEFAULT_BRAND_COLOR) || DEFAULT_BRAND_COLOR,
  };
}

async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  await upsertAppSettings({
    companyName: settings.companyName,
    companyLogo: settings.companyLogo,
    companyAddress: settings.companyAddress,
    companyPhone: settings.companyPhone,
    companyFax: settings.companyFax,
    companyGsm: settings.companyGsm,
    companyEmail: settings.companyEmail,
    brandColor: settings.brandColor || DEFAULT_BRAND_COLOR,
  });
}

async function getBackupPreferences(): Promise<BackupPreferences> {
  const settings = await listAppSettings();
  const frequency = readString(settings.autoBackupFrequency, "disabled") as AutoBackupFrequency;
  return {
    autoBackupFrequency: ["daily", "weekly", "monthly"].includes(frequency) ? frequency : "disabled",
    lastBackupDate: readNullableString(settings.lastBackupDate),
    lastAutoBackupCheck: readNullableString(settings.lastAutoBackupCheck),
  };
}

async function saveBackupPreferences(preferences: Partial<BackupPreferences>): Promise<void> {
  await upsertAppSettings({
    ...(preferences.autoBackupFrequency !== undefined ? { autoBackupFrequency: preferences.autoBackupFrequency } : {}),
    ...(preferences.lastBackupDate !== undefined ? { lastBackupDate: preferences.lastBackupDate } : {}),
    ...(preferences.lastAutoBackupCheck !== undefined ? { lastAutoBackupCheck: preferences.lastAutoBackupCheck } : {}),
  });
}

async function getGpsSettings(): Promise<GpsSettings | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("gpswox_settings")
    .select("api_url,email,password")
    .is("company_id", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;

  const row = data?.[0];
  if (!row) return null;
  return {
    api_url: readString(row.api_url, "sf-tracker.pro"),
    email: readString(row.email),
    password: readString(row.password),
  };
}

async function saveGpsSettings(settings: GpsSettings): Promise<void> {
  const supabase = requireSupabase();
  const payload = {
    company_id: null,
    api_url: settings.api_url.trim(),
    email: settings.email.trim(),
    password: settings.password,
  };

  const { data: existing, error: existingError } = await supabase
    .from("gpswox_settings")
    .select("id")
    .is("company_id", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (existingError) throw existingError;

  const existingId = existing?.[0]?.id;
  if (existingId) {
    const { error } = await supabase.from("gpswox_settings").update(payload).eq("id", existingId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("gpswox_settings").insert(payload);
  if (error) throw error;
}

async function clearGpsSettings(): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("gpswox_settings").delete().is("company_id", null);
  if (error) throw error;
}

async function clearAppSettings(): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from(APP_SETTINGS_TABLE).delete().not("id", "is", null);
  if (error) throw error;
}

export interface AppSettings {
  company: CompanySettings;
  backup: BackupPreferences;
  gps: GpsSettings | null;
}

export const settingsRepository = {
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_BACKUP_PREFERENCES,
  listAppSettings,
  upsertAppSettings,
  getCompanySettings,
  saveCompanySettings,
  getBackupPreferences,
  saveBackupPreferences,
  getGpsSettings,
  saveGpsSettings,
  clearGpsSettings,
  clearAppSettings,
  
  async get(): Promise<AppSettings> {
    const [company, backup, gps] = await Promise.all([
      getCompanySettings(),
      getBackupPreferences(),
      getGpsSettings()
    ]);
    return { company, backup, gps };
  },

  async update(updates: Partial<AppSettings>): Promise<AppSettings> {
    if (updates.company) {
      await saveCompanySettings(updates.company);
    }
    if (updates.backup) {
      await saveBackupPreferences(updates.backup);
    }
    if (updates.gps) {
      await saveGpsSettings(updates.gps);
    }
    return this.get();
  }
};
