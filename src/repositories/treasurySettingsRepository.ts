import { getSupabaseClient } from "@/services/supabaseService";
import {
  getActiveTenantUserId,
  isValidUuid,
  getScopedStorageKey,
} from "./repositoryUtils";

export interface TreasurySettings {
  entryTarget: number;
  exitCap: number;
  minAvailable: number;
  urgentCheckDays: number;
  highDebtAmount: number;
  urgentExpenseDays: number;
  cashAlertThreshold: number;
  bankAlertThreshold: number;
}

const STORAGE_KEY_TREASURY_SETTINGS = "iloca:treasury_settings:local";

const DEFAULT_SETTINGS: TreasurySettings = {
  entryTarget: 120000,
  exitCap: 80000,
  minAvailable: 25000,
  urgentCheckDays: 3,
  highDebtAmount: 10000,
  urgentExpenseDays: 7,
  cashAlertThreshold: 2000,
  bankAlertThreshold: 5000,
};

function getLocalTreasury(userId?: string | null): TreasurySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const key = getScopedStorageKey(STORAGE_KEY_TREASURY_SETTINGS, userId);
  if (!key) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalTreasury(settings: TreasurySettings, userId?: string | null): void {
  if (typeof window === "undefined") return;
  const key = getScopedStorageKey(STORAGE_KEY_TREASURY_SETTINGS, userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (e) {
    console.warn("Could not save local treasury settings:", e);
  }
}

export const treasurySettingsRepository = {
  async get(): Promise<TreasurySettings> {
    const activeUserId = getActiveTenantUserId();
    const local = getLocalTreasury(activeUserId);
    if (!activeUserId) return DEFAULT_SETTINGS;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("treasury_settings")
          .select("*")
          .eq("user_id", activeUserId)
          .maybeSingle();
        if (!error && data) {
          const fetched: TreasurySettings = {
            entryTarget: data.entry_target,
            exitCap: data.exit_cap,
            minAvailable: data.min_available,
            urgentCheckDays: data.urgent_check_days,
            highDebtAmount: data.high_debt_amount,
            urgentExpenseDays: data.urgent_expense_days,
            cashAlertThreshold: data.cash_alert_threshold,
            bankAlertThreshold: data.bank_alert_threshold,
          };
          saveLocalTreasury(fetched, activeUserId);
          return fetched;
        }
      }
    } catch (err) {
      console.warn("Error getting treasury settings from Supabase:", err);
    }
    return local;
  },

  async update(settings: Partial<TreasurySettings>): Promise<TreasurySettings> {
    const activeUserId = getActiveTenantUserId();
    const local = getLocalTreasury(activeUserId);
    const merged: TreasurySettings = { ...local, ...settings };
    saveLocalTreasury(merged, activeUserId);

    if (!activeUserId) return merged;

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const payload: any = {
          user_id: activeUserId,
        };
        if (settings.entryTarget !== undefined) payload.entry_target = settings.entryTarget;
        if (settings.exitCap !== undefined) payload.exit_cap = settings.exitCap;
        if (settings.minAvailable !== undefined) payload.min_available = settings.minAvailable;
        if (settings.urgentCheckDays !== undefined) payload.urgent_check_days = settings.urgentCheckDays;
        if (settings.highDebtAmount !== undefined) payload.high_debt_amount = settings.highDebtAmount;
        if (settings.urgentExpenseDays !== undefined) payload.urgent_expense_days = settings.urgentExpenseDays;
        if (settings.cashAlertThreshold !== undefined) payload.cash_alert_threshold = settings.cashAlertThreshold;
        if (settings.bankAlertThreshold !== undefined) payload.bank_alert_threshold = settings.bankAlertThreshold;

        const { data, error } = await supabase
          .from("treasury_settings")
          .upsert(payload, { onConflict: "user_id" })
          .select()
          .maybeSingle();
        if (!error && data) {
          const saved: TreasurySettings = {
            entryTarget: data.entry_target,
            exitCap: data.exit_cap,
            minAvailable: data.min_available,
            urgentCheckDays: data.urgent_check_days,
            highDebtAmount: data.high_debt_amount,
            urgentExpenseDays: data.urgent_expense_days,
            cashAlertThreshold: data.cash_alert_threshold,
            bankAlertThreshold: data.bank_alert_threshold,
          };
          saveLocalTreasury(saved, activeUserId);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase treasury settings update exception:", err);
    }

    return merged;
  }
};
