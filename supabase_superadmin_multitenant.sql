-- ==============================================================================
-- SCRIPT SUPABASE : SUPER ADMINISTRATEUR & MULTI-TENANT ISOLATION (VERSION ROBUSTE)
-- ==============================================================================
-- Instructions : 
-- 1. Ouvrez l'editeur SQL Supabase (SQL Editor).
-- 2. Creez une nouvelle requete vide ("New query").
-- 3. Collez ce contenu SANS SELECTIONNER de texte (ou appuyez sur Ctrl+A puis Run).
-- ==============================================================================

-- 1. CREATION / EXTENSION DE LA TABLE PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    company_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'admin',
    status TEXT DEFAULT 'en_attente',
    avatar_url TEXT,
    last_login_at TIMESTAMPTZ,
    total_seconds_spent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ajouter les colonnes si la table existait deja
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'en_attente';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_seconds_spent INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. TABLE DES SESSIONS ET FLUX D'ACTIVITE RECENTE
CREATE TABLE IF NOT EXISTS public.user_sessions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    company_name TEXT,
    login_at TIMESTAMPTZ DEFAULT now(),
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    duration_seconds INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.user_sessions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_login_at ON public.user_sessions_log(login_at DESC);

-- 3. DECLENCHEUR D'INSCRIPTION AUTOMATIQUE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        company_name, 
        phone, 
        role, 
        status, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        LOWER(NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Entreprise Indépendante'),
        NEW.raw_user_meta_data->>'phone',
        CASE WHEN LOWER(NEW.email) = 'medoraelis93@gmail.com' THEN 'super_admin' ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'admin') END,
        CASE WHEN LOWER(NEW.email) = 'medoraelis93@gmail.com' THEN 'valide' ELSE 'en_attente' END,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        company_name = COALESCE(EXCLUDED.company_name, public.profiles.company_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. INITIALISER LE COMPTE SUPER ADMINISTRATEUR EXISTANT
UPDATE public.profiles
SET 
    role = 'super_admin',
    status = 'valide',
    company_name = COALESCE(company_name, 'SFTLOCATION')
WHERE LOWER(email) = 'medoraelis93@gmail.com';

-- 5. FONCTION VERIFICATION DU SUPER ADMIN
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() 
          AND (role = 'super_admin' OR LOWER(email) = 'medoraelis93@gmail.com')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. POLITIQUES RLS SUR PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (public.is_super_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE USING (public.is_super_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE USING (public.is_super_admin());

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT WITH CHECK (public.is_super_admin() OR auth.uid() = id);

-- 7. POLITIQUES RLS SUR SESSIONS
ALTER TABLE public.user_sessions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_all_policy" ON public.user_sessions_log;
CREATE POLICY "sessions_all_policy" ON public.user_sessions_log
FOR ALL USING (public.is_super_admin() OR auth.uid() = user_id);

-- 8. POLITIQUES SUR LES TABLES METIERS (ISOLATION MULTI-TENANT)

-- VEHICULES
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicles_tenant_policy" ON public.vehicles;
CREATE POLICY "vehicles_tenant_policy" ON public.vehicles
FOR ALL USING (auth.uid() = user_id OR public.is_super_admin())
WITH CHECK (auth.uid() = user_id OR public.is_super_admin());

-- CONTRATS
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contracts_tenant_policy" ON public.contracts;
CREATE POLICY "contracts_tenant_policy" ON public.contracts
FOR ALL USING (auth.uid() = user_id OR public.is_super_admin())
WITH CHECK (auth.uid() = user_id OR public.is_super_admin());

-- CLIENTS
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clients_tenant_policy" ON public.clients;
CREATE POLICY "clients_tenant_policy" ON public.clients
FOR ALL USING (auth.uid() = user_id OR public.is_super_admin())
WITH CHECK (auth.uid() = user_id OR public.is_super_admin());

-- REPARATIONS
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repairs_tenant_policy" ON public.repairs;
CREATE POLICY "repairs_tenant_policy" ON public.repairs
FOR ALL USING (auth.uid() = user_id OR public.is_super_admin())
WITH CHECK (auth.uid() = user_id OR public.is_super_admin());

-- DEPENSES
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_tenant_policy" ON public.expenses;
CREATE POLICY "expenses_tenant_policy" ON public.expenses
FOR ALL USING (auth.uid() = user_id OR public.is_super_admin())
WITH CHECK (auth.uid() = user_id OR public.is_super_admin());

-- FACTURES (Si la table existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
        ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
        ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "invoices_tenant_policy" ON public.invoices;
        CREATE POLICY "invoices_tenant_policy" ON public.invoices
        FOR ALL USING (auth.uid() = user_id OR public.is_super_admin())
        WITH CHECK (auth.uid() = user_id OR public.is_super_admin());
    END IF;
END $$;

-- PAIEMENTS (Si la table existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
        ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
        ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "payments_tenant_policy" ON public.payments;
        CREATE POLICY "payments_tenant_policy" ON public.payments
        FOR ALL USING (auth.uid() = user_id OR public.is_super_admin())
        WITH CHECK (auth.uid() = user_id OR public.is_super_admin());
    END IF;
END $$;
