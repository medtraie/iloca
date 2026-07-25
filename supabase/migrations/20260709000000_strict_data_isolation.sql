-- Migration to strictly isolate user data and re-enable standard RLS policies
-- This script replaces "Allow all access" policies with user-specific isolation.

DO $$ 
BEGIN
    -- 1. Payments Table
    DROP POLICY IF EXISTS "Allow all access to payments" ON public.payments;
    DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
    DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
    DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
    DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;
    
    CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own payments" ON public.payments FOR DELETE USING (auth.uid() = user_id);
    
    ALTER TABLE public.payments ALTER COLUMN user_id SET NOT NULL;

    -- 2. Bank Transfers Table
    DROP POLICY IF EXISTS "Allow all access to bank transfers" ON public.bank_transfers;
    DROP POLICY IF EXISTS "Users can view their own bank transfers" ON public.bank_transfers;
    DROP POLICY IF EXISTS "Users can insert their own bank transfers" ON public.bank_transfers;
    DROP POLICY IF EXISTS "Users can update their own bank transfers" ON public.bank_transfers;
    DROP POLICY IF EXISTS "Users can delete their own bank transfers" ON public.bank_transfers;

    CREATE POLICY "Users can view their own bank transfers" ON public.bank_transfers FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own bank transfers" ON public.bank_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own bank transfers" ON public.bank_transfers FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own bank transfers" ON public.bank_transfers FOR DELETE USING (auth.uid() = user_id);
    
    ALTER TABLE public.bank_transfers ALTER COLUMN user_id SET NOT NULL;

    -- 3. Audit Logs Table
    DROP POLICY IF EXISTS "Allow all access to audit_logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;

    CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    ALTER TABLE public.audit_logs ALTER COLUMN user_id SET NOT NULL;

    -- 4. Contracts Table
    DROP POLICY IF EXISTS "Allow all access to contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Users can insert their own contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;

    CREATE POLICY "Users can view their own contracts" ON public.contracts FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own contracts" ON public.contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own contracts" ON public.contracts FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own contracts" ON public.contracts FOR DELETE USING (auth.uid() = user_id);
    
    ALTER TABLE public.contracts ALTER COLUMN user_id SET NOT NULL;

    -- 5. Treasury Settings Table
    DROP POLICY IF EXISTS "Allow all access to treasury settings" ON public.treasury_settings;
    DROP POLICY IF EXISTS "Users can view their own treasury settings" ON public.treasury_settings;
    DROP POLICY IF EXISTS "Users can upsert their own treasury settings" ON public.treasury_settings;
    DROP POLICY IF EXISTS "Users can update their own treasury settings" ON public.treasury_settings;

    CREATE POLICY "Users can view their own treasury settings" ON public.treasury_settings FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can upsert their own treasury settings" ON public.treasury_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own treasury settings" ON public.treasury_settings FOR UPDATE USING (auth.uid() = user_id);
    
    ALTER TABLE public.treasury_settings ALTER COLUMN user_id SET NOT NULL;

    -- 6. Miscellaneous Expenses Table
    DROP POLICY IF EXISTS "Allow all access to miscellaneous expenses" ON public.miscellaneous_expenses;
    DROP POLICY IF EXISTS "Users can view their own miscellaneous expenses" ON public.miscellaneous_expenses;
    DROP POLICY IF EXISTS "Users can insert their own miscellaneous expenses" ON public.miscellaneous_expenses;
    DROP POLICY IF EXISTS "Users can update their own miscellaneous expenses" ON public.miscellaneous_expenses;
    DROP POLICY IF EXISTS "Users can delete their own miscellaneous expenses" ON public.miscellaneous_expenses;

    CREATE POLICY "Users can view their own miscellaneous expenses" ON public.miscellaneous_expenses FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own miscellaneous expenses" ON public.miscellaneous_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own miscellaneous expenses" ON public.miscellaneous_expenses FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own miscellaneous expenses" ON public.miscellaneous_expenses FOR DELETE USING (auth.uid() = user_id);
    
    ALTER TABLE public.miscellaneous_expenses ALTER COLUMN user_id SET NOT NULL;

    -- 7. Vehicles Table
    DROP POLICY IF EXISTS "Allow all access to vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.vehicles;

    CREATE POLICY "Users can view their own vehicles" ON public.vehicles FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own vehicles" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own vehicles" ON public.vehicles FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own vehicles" ON public.vehicles FOR DELETE USING (auth.uid() = user_id);
    
    ALTER TABLE public.vehicles ALTER COLUMN user_id SET NOT NULL;

    -- 8. App Settings Table
    DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;
    DROP POLICY IF EXISTS "Users can view their own app settings" ON public.app_settings;
    DROP POLICY IF EXISTS "Users can insert their own app settings" ON public.app_settings;
    DROP POLICY IF EXISTS "Users can update their own app settings" ON public.app_settings;
    DROP POLICY IF EXISTS "Users can delete their own app settings" ON public.app_settings;

    CREATE POLICY "Users can view their own app settings" ON public.app_settings FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own app settings" ON public.app_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own app settings" ON public.app_settings FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own app settings" ON public.app_settings FOR DELETE USING (auth.uid() = user_id);
    
    ALTER TABLE public.app_settings ALTER COLUMN user_id SET NOT NULL;

    -- 9. GPSwox Snapshots & Cache (Analytics & Tools)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gpswox_snapshots' AND column_name='user_id') THEN
        ALTER TABLE public.gpswox_snapshots ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gpswox_devices_cache' AND column_name='user_id') THEN
        ALTER TABLE public.gpswox_devices_cache ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    ALTER TABLE public.gpswox_snapshots ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.gpswox_devices_cache ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own snapshots" ON public.gpswox_snapshots;
    DROP POLICY IF EXISTS "Users can insert their own snapshots" ON public.gpswox_snapshots;
    CREATE POLICY "Users can view their own snapshots" ON public.gpswox_snapshots FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own snapshots" ON public.gpswox_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can view their own devices cache" ON public.gpswox_devices_cache;
    DROP POLICY IF EXISTS "Users can upsert their own devices cache" ON public.gpswox_devices_cache;
    CREATE POLICY "Users can view their own devices cache" ON public.gpswox_devices_cache FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can upsert their own devices cache" ON public.gpswox_devices_cache FOR ALL USING (auth.uid() = user_id);

END $$;
