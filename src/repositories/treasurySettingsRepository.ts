import { getSupabaseClient } from "@/services/supabaseService";

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

function getLocalTreasury(): TreasurySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TREASURY_SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalTreasury(settings: TreasurySettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_TREASURY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn("Could not save local treasury settings:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const treasurySettingsRepository = {
  async get(): Promise<TreasurySettings> {
    const local = getLocalTreasury();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("treasury_settings").select("*").single();
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
          saveLocalTreasury(fetched);
          return fetched;
        }
      }
    } catch (err) {
      console.warn("Error getting treasury settings from Supabase:", err);
    }
    return local;
  },

  async update(settings: Partial<TreasurySettings>): Promise<TreasurySettings> {
    const local = getLocalTreasury();
    const merged: TreasurySettings = { ...local, ...settings };
    saveLocalTreasury(merged);

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const payload: any = {};
        if (settings.entryTarget !== undefined) payload.entry_target = settings.entryTarget;
        if (settings.exitCap !== undefined) payload.exit_cap = settings.exitCap;
        if (settings.minAvailable !== undefined) payload.min_available = settings.minAvailable;
        if (settings.urgentCheckDays !== undefined) payload.urgent_check_days = settings.urgentCheckDays;
        if (settings.highDebtAmount !== undefined) payload.high_debt_amount = settings.highDebtAmount;
        if (settings.urgentExpenseDays !== undefined) payload.urgent_expense_days = settings.urgentExpenseDays;
        if (settings.cashAlertThreshold !== undefined) payload.cash_alert_threshold = settings.cashAlertThreshold;
        if (settings.bankAlertThreshold !== undefined) payload.bank_alert_threshold = settings.bankAlertThreshold;

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

        if (userId) payload.user_id = userId;

        const { data, error } = await supabase
          .from("treasury_settings")
          .upsert(payload)
          .select()
          .single();
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
          saveLocalTreasury(saved);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase treasury settings update exception:", err);
    }

    return merged;
  }
};

