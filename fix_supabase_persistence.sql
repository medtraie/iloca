-- ==============================================================================
-- SCRIPT CORRECTION SUPABASE : PERSISTANCE COMPLETE DES DONNEES (VERSION ROBUSTE)
-- ==============================================================================
-- Instructions : 
-- 1. Ouvrez l'editeur SQL Supabase (SQL Editor : https://supabase.com/dashboard/project/wypifrsooooeejfckomg/sql/new).
-- 2. Creez une nouvelle requete ("New query").
-- 3. Collez ce code SQL puis cliquez sur "Run".
-- ==============================================================================

-- 1. DESACTIVER LA CONTRAINTE NOT NULL SUR USER_ID POUR TOUTES LES TABLES
ALTER TABLE IF EXISTS public.vehicles ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.clients ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.contracts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.payments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.expenses ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.miscellaneous_expenses ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.repairs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.invoices ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.bank_transfers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.app_settings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.treasury_settings ALTER COLUMN user_id DROP NOT NULL;

-- 2. NETTOYAGE COMPLET DE TOUTES LES ANCIENNES POLITIQUES EXISTANTES
DO $$ 
BEGIN
    -- VEHICLES
    DROP POLICY IF EXISTS "vehicles_tenant_policy" ON public.vehicles;
    DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Allow all access to vehicles" ON public.vehicles;

    -- CLIENTS
    DROP POLICY IF EXISTS "clients_tenant_policy" ON public.clients;
    DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Allow all access to clients" ON public.clients;

    -- CONTRACTS
    DROP POLICY IF EXISTS "contracts_tenant_policy" ON public.contracts;
    DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Users can insert their own contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Allow all access to contracts" ON public.contracts;

    -- PAYMENTS
    DROP POLICY IF EXISTS "payments_tenant_policy" ON public.payments;
    DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
    DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
    DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
    DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;
    DROP POLICY IF EXISTS "Allow all access to payments" ON public.payments;

    -- EXPENSES
    DROP POLICY IF EXISTS "expenses_tenant_policy" ON public.expenses;
    DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
    DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
    DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
    DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;
    DROP POLICY IF EXISTS "Allow all access to expenses" ON public.expenses;

    -- MISCELLANEOUS EXPENSES
    DROP POLICY IF EXISTS "miscellaneous_expenses_tenant_policy" ON public.miscellaneous_expenses;
    DROP POLICY IF EXISTS "Users can view their own miscellaneous expenses" ON public.miscellaneous_expenses;
    DROP POLICY IF EXISTS "Users can insert their own miscellaneous expenses" ON public.miscellaneous_expenses;
    DROP POLICY IF EXISTS "Users can update their own miscellaneous expenses" ON public.miscellaneous_expenses;
    DROP POLICY IF EXISTS "Users can delete their own miscellaneous expenses" ON public.miscellaneous_expenses;
    DROP POLICY IF EXISTS "Allow all access to miscellaneous expenses" ON public.miscellaneous_expenses;

    -- REPAIRS
    DROP POLICY IF EXISTS "repairs_tenant_policy" ON public.repairs;
    DROP POLICY IF EXISTS "Users can view their own repairs" ON public.repairs;
    DROP POLICY IF EXISTS "Users can insert their own repairs" ON public.repairs;
    DROP POLICY IF EXISTS "Users can update their own repairs" ON public.repairs;
    DROP POLICY IF EXISTS "Users can delete their own repairs" ON public.repairs;
    DROP POLICY IF EXISTS "Allow all access to repairs" ON public.repairs;

    -- INVOICES
    DROP POLICY IF EXISTS "invoices_tenant_policy" ON public.invoices;
    DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Allow all access to invoices" ON public.invoices;

    -- BANK TRANSFERS
    DROP POLICY IF EXISTS "bank_transfers_tenant_policy" ON public.bank_transfers;
    DROP POLICY IF EXISTS "Users can view their own bank transfers" ON public.bank_transfers;
    DROP POLICY IF EXISTS "Users can insert their own bank transfers" ON public.bank_transfers;
    DROP POLICY IF EXISTS "Users can update their own bank transfers" ON public.bank_transfers;
    DROP POLICY IF EXISTS "Users can delete their own bank transfers" ON public.bank_transfers;
    DROP POLICY IF EXISTS "Allow all access to bank transfers" ON public.bank_transfers;

    -- AUDIT LOGS
    DROP POLICY IF EXISTS "audit_logs_tenant_policy" ON public.audit_logs;
    DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Allow all access to audit logs" ON public.audit_logs;

    -- APP SETTINGS
    DROP POLICY IF EXISTS "app_settings_tenant_policy" ON public.app_settings;
    DROP POLICY IF EXISTS "Users can view their own app settings" ON public.app_settings;
    DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;

    -- TREASURY SETTINGS
    DROP POLICY IF EXISTS "treasury_settings_tenant_policy" ON public.treasury_settings;
    DROP POLICY IF EXISTS "Allow all access to treasury settings" ON public.treasury_settings;
END $$;

-- 3. ACTIVER RLS AVEC POLITIQUES PERMISSIVES SANS BLOCAGE (ACCES GLOBAL SUPABASE)
ALTER TABLE IF EXISTS public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.miscellaneous_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bank_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.treasury_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to vehicles" ON public.vehicles;
CREATE POLICY "Allow all access to vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to clients" ON public.clients;
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to contracts" ON public.contracts;
CREATE POLICY "Allow all access to contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to payments" ON public.payments;
CREATE POLICY "Allow all access to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to expenses" ON public.expenses;
CREATE POLICY "Allow all access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to miscellaneous expenses" ON public.miscellaneous_expenses;
CREATE POLICY "Allow all access to miscellaneous expenses" ON public.miscellaneous_expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to repairs" ON public.repairs;
CREATE POLICY "Allow all access to repairs" ON public.repairs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to invoices" ON public.invoices;
CREATE POLICY "Allow all access to invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to bank transfers" ON public.bank_transfers;
CREATE POLICY "Allow all access to bank transfers" ON public.bank_transfers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to audit logs" ON public.audit_logs;
CREATE POLICY "Allow all access to audit logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;
CREATE POLICY "Allow all access to app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to treasury settings" ON public.treasury_settings;
CREATE POLICY "Allow all access to treasury settings" ON public.treasury_settings FOR ALL USING (true) WITH CHECK (true);
