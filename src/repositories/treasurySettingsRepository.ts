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

export const treasurySettingsRepository = {
  async get(): Promise<TreasurySettings> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("treasury_settings").select("*").single();
    if (error) {
      if (error.code === "PGRST116") return DEFAULT_SETTINGS;
      throw error;
    }
    
    return {
      entryTarget: data.entry_target,
      exitCap: data.exit_cap,
      minAvailable: data.min_available,
      urgentCheckDays: data.urgent_check_days,
      highDebtAmount: data.high_debt_amount,
      urgentExpenseDays: data.urgent_expense_days,
      cashAlertThreshold: data.cash_alert_threshold,
      bankAlertThreshold: data.bank_alert_threshold,
    };
  },

  async update(settings: Partial<TreasurySettings>): Promise<TreasurySettings> {
    const supabase = getSupabaseClient();
    const payload: any = {};
    if (settings.entryTarget !== undefined) payload.entry_target = settings.entryTarget;
    if (settings.exitCap !== undefined) payload.exit_cap = settings.exitCap;
    if (settings.minAvailable !== undefined) payload.min_available = settings.minAvailable;
    if (settings.urgentCheckDays !== undefined) payload.urgent_check_days = settings.urgentCheckDays;
    if (settings.highDebtAmount !== undefined) payload.high_debt_amount = settings.highDebtAmount;
    if (settings.urgentExpenseDays !== undefined) payload.urgent_expense_days = settings.urgentExpenseDays;
    if (settings.cashAlertThreshold !== undefined) payload.cash_alert_threshold = settings.cashAlertThreshold;
    if (settings.bankAlertThreshold !== undefined) payload.bank_alert_threshold = settings.bankAlertThreshold;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("treasury_settings")
      .upsert({ user_id: user.user.id, ...payload })
      .select()
      .single();
    if (error) throw error;
    
    return {
      entryTarget: data.entry_target,
      exitCap: data.exit_cap,
      minAvailable: data.min_available,
      urgentCheckDays: data.urgent_check_days,
      highDebtAmount: data.high_debt_amount,
      urgentExpenseDays: data.urgent_expense_days,
      cashAlertThreshold: data.cash_alert_threshold,
      bankAlertThreshold: data.bank_alert_threshold,
    };
  }
};
