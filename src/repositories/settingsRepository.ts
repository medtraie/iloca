import { getSupabaseClient, getSupabaseConfigError } from "@/services/supabaseService";
import type { AutoBackupFrequency, BackupPreferences, CompanySettings, GpsSettings } from "@/types/appData";
import { DEFAULT_BRAND_COLOR } from "@/utils/brandTheme";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const APP_SETTINGS_TABLE = "app_settings";
const STORAGE_KEY_LOCAL_SETTINGS = "iloca:app_settings:local";

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

function getLocalSettings(): Record<string, JsonValue> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_SETTINGS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalSettings(values: Record<string, JsonValue>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalSettings();
    localStorage.setItem(STORAGE_KEY_LOCAL_SETTINGS, JSON.stringify({ ...existing, ...values }));
  } catch (e) {
    console.warn("Could not save local settings:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const readString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const readNullableString = (value: unknown) => (typeof value === "string" && value !== "" ? value : null);

async function listAppSettings(): Promise<Record<string, JsonValue>> {
  const local = getLocalSettings();
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from(APP_SETTINGS_TABLE).select("setting_key, setting_value");
      if (!error && data) {
        const remote = (data || []).reduce<Record<string, JsonValue>>((acc, row: any) => {
          acc[String(row.setting_key)] = row.setting_value as JsonValue;
          return acc;
        }, {});
        saveLocalSettings(remote);
        return { ...local, ...remote };
      }
    }
  } catch (err) {
    console.warn("Error loading app settings from Supabase:", err);
  }
  return local;
}

async function upsertAppSettings(values: Record<string, JsonValue>): Promise<void> {
  saveLocalSettings(values);
  const entries = Object.entries(values);
  if (!entries.length) return;

  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: authData } = await supabase.auth.getUser();
      const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
      let activeUserId: string | null = null;
      if (activeUserStr) {
        try {
          activeUserId = JSON.parse(activeUserStr)?.id || null;
        } catch {}
      }
      const candidateId = authData.user?.id || activeUserId;
      const userId = isValidUuid(candidateId) ? candidateId : null;

      const payload = entries.map(([setting_key, setting_value]) => {
        const row: any = {
          setting_key,
          setting_value: setting_value === null ? "" : setting_value,
        };
        if (userId) row.user_id = userId;
        return row;
      });

      await supabase.from(APP_SETTINGS_TABLE).upsert(payload, { onConflict: userId ? "user_id,setting_key" : "setting_key" });
    }
  } catch (err) {
    console.warn("Supabase upsertAppSettings exception (saved locally):", err);
  }
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
  const payload: Record<string, JsonValue> = {};
  
  if (settings.companyName !== undefined) payload.companyName = settings.companyName;
  if (settings.companyLogo !== undefined) payload.companyLogo = settings.companyLogo;
  if (settings.companyAddress !== undefined) payload.companyAddress = settings.companyAddress;
  if (settings.companyPhone !== undefined) payload.companyPhone = settings.companyPhone;
  if (settings.companyFax !== undefined) payload.companyFax = settings.companyFax;
  if (settings.companyGsm !== undefined) payload.companyGsm = settings.companyGsm;
  if (settings.companyEmail !== undefined) payload.companyEmail = settings.companyEmail;
  if (settings.brandColor !== undefined) payload.brandColor = settings.brandColor || DEFAULT_BRAND_COLOR;

  if (Object.keys(payload).length > 0) {
    await upsertAppSettings(payload);
  }
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
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("gpswox_settings")
        .select("api_url,email,password")
        .is("company_id", null)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (!error && data?.[0]) {
        const row = data[0];
        return {
          api_url: readString(row.api_url, "sf-tracker.pro"),
          email: readString(row.email),
          password: readString(row.password),
        };
      }
    }
  } catch (err) {
    console.warn("Supabase getGpsSettings exception:", err);
  }

  const local = getLocalSettings();
  if (local.gpsSettings) {
    return local.gpsSettings as any;
  }
  return null;
}

async function saveGpsSettings(settings: GpsSettings): Promise<void> {
  saveLocalSettings({ gpsSettings: settings as any });
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const payload = {
        company_id: null,
        api_url: settings.api_url.trim(),
        email: settings.email.trim(),
        password: settings.password,
      };

      const { data: existing } = await supabase
        .from("gpswox_settings")
        .select("id")
        .is("company_id", null)
        .order("updated_at", { ascending: false })
        .limit(1);

      const existingId = existing?.[0]?.id;
      if (existingId) {
        await supabase.from("gpswox_settings").update(payload).eq("id", existingId);
      } else {
        await supabase.from("gpswox_settings").insert(payload);
      }
    }
  } catch (err) {
    console.warn("Supabase saveGpsSettings exception (saved locally):", err);
  }
}

async function clearGpsSettings(): Promise<void> {
  saveLocalSettings({ gpsSettings: null });
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from("gpswox_settings").delete().is("company_id", null);
    }
  } catch (err) {
    console.warn("Supabase clearGpsSettings exception:", err);
  }
}

async function clearAppSettings(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_LOCAL_SETTINGS);
  }
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from(APP_SETTINGS_TABLE).delete().not("id", "is", null);
    }
  } catch (err) {
    console.warn("Supabase clearAppSettings exception:", err);
  }
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

