-- ============================================================
-- Quotora Database Schema — Full Migration
-- Multi-tenant, multi-branch quotation SaaS for auto dealerships
-- ============================================================

-- ─── 1. TENANTS ───
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. BRANCHES ───
CREATE TABLE IF NOT EXISTS branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_hq BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. PROFILES ───
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('dealer_admin', 'branch_manager', 'employee')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. CATEGORIES ───
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. MODELS ───
CREATE TABLE IF NOT EXISTS models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 6. FUEL TYPES ───
CREATE TABLE IF NOT EXISTS fuel_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. TRANSMISSION TYPES ───
CREATE TABLE IF NOT EXISTS transmission_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 8. VARIANTS ───
CREATE TABLE IF NOT EXISTS variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fuel_type_id UUID REFERENCES fuel_types(id) ON DELETE SET NULL,
  transmission_type_id UUID REFERENCES transmission_types(id) ON DELETE SET NULL,
  price NUMERIC(12, 2) DEFAULT 0,
  variant_order INTEGER DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 9. ACCESSORY TYPES ───
CREATE TABLE IF NOT EXISTS accessory_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 10. ACCESSORIES ───
CREATE TABLE IF NOT EXISTS accessories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type_id UUID REFERENCES accessory_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 11. VARIANT_ACCESSORIES (Join Table) ───
CREATE TABLE IF NOT EXISTS variant_accessories (
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  accessory_id UUID NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  is_standard BOOLEAN DEFAULT false,
  PRIMARY KEY (variant_id, accessory_id)
);

-- ─── 12. CUSTOMERS (CRM/Leads) ───
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 13. QUOTATIONS ───
CREATE TABLE IF NOT EXISTS quotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  total_price NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 14. QUOTATION_ACCESSORIES ───
CREATE TABLE IF NOT EXISTS quotation_accessories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  accessory_id UUID NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  price NUMERIC(12, 2) DEFAULT 0
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_models_tenant ON models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_models_category ON models(category_id);
CREATE INDEX IF NOT EXISTS idx_fuel_types_tenant ON fuel_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transmission_types_tenant ON transmission_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_variants_tenant ON variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_variants_model ON variants(model_id);
CREATE INDEX IF NOT EXISTS idx_accessory_types_tenant ON accessory_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accessories_tenant ON accessories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_accessories_quotation ON quotation_accessories(quotation_id);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'tenants', 'branches', 'profiles', 'categories', 'models',
      'fuel_types', 'transmission_types', 'variants', 'accessory_types',
      'accessories', 'customers', 'quotations'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I; CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessory_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_accessories ENABLE ROW LEVEL SECURITY;

-- ─── Helper: get current user's tenant_id ───
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── TENANTS: users can only see their own tenant ───
DROP POLICY IF EXISTS "tenants_select" ON tenants;
CREATE POLICY "tenants_select" ON tenants FOR SELECT USING (
  id = get_user_tenant_id()
);
-- Allow INSERT for new signups (no profile yet, so we must allow)
DROP POLICY IF EXISTS "tenants_insert" ON tenants;
CREATE POLICY "tenants_insert" ON tenants FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "tenants_update" ON tenants;
CREATE POLICY "tenants_update" ON tenants FOR UPDATE USING (
  id = get_user_tenant_id()
);

-- ─── BRANCHES: scoped to tenant ───
DROP POLICY IF EXISTS "branches_select" ON branches;
CREATE POLICY "branches_select" ON branches FOR SELECT USING (
  tenant_id = get_user_tenant_id()
);
DROP POLICY IF EXISTS "branches_insert" ON branches;
CREATE POLICY "branches_insert" ON branches FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "branches_update" ON branches;
CREATE POLICY "branches_update" ON branches FOR UPDATE USING (
  tenant_id = get_user_tenant_id()
);
DROP POLICY IF EXISTS "branches_delete" ON branches;
CREATE POLICY "branches_delete" ON branches FOR DELETE USING (
  tenant_id = get_user_tenant_id()
);

-- ─── PROFILES: users can see profiles in their tenant ───
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  tenant_id = get_user_tenant_id() OR id = auth.uid()
);
-- Allow INSERT for onboarding (profile doesn't exist yet) or by dealer_admin within their tenant
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  id = auth.uid() OR
  (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'dealer_admin' AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
);
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  tenant_id = get_user_tenant_id()
);

-- ─── Generic tenant-scoped policies (for catalog, CRM, quotes) ───
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'categories', 'models', 'fuel_types', 'transmission_types',
      'variants', 'accessory_types', 'accessories', 'customers', 'quotations'
    ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "%1$s_select" ON %1$I; CREATE POLICY "%1$s_select" ON %1$I FOR SELECT USING (tenant_id = get_user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "%1$s_insert" ON %1$I; CREATE POLICY "%1$s_insert" ON %1$I FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "%1$s_update" ON %1$I; CREATE POLICY "%1$s_update" ON %1$I FOR UPDATE USING (tenant_id = get_user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "%1$s_delete" ON %1$I; CREATE POLICY "%1$s_delete" ON %1$I FOR DELETE USING (tenant_id = get_user_tenant_id())',
      tbl
    );
  END LOOP;
END;
$$;

-- ─── VARIANT_ACCESSORIES: scoped via variant's tenant ───
DROP POLICY IF EXISTS "variant_accessories_select" ON variant_accessories;
CREATE POLICY "variant_accessories_select" ON variant_accessories FOR SELECT USING (
  EXISTS (SELECT 1 FROM variants WHERE variants.id = variant_accessories.variant_id AND variants.tenant_id = get_user_tenant_id())
);
DROP POLICY IF EXISTS "variant_accessories_insert" ON variant_accessories;
CREATE POLICY "variant_accessories_insert" ON variant_accessories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM variants WHERE variants.id = variant_accessories.variant_id AND variants.tenant_id = get_user_tenant_id())
);
DROP POLICY IF EXISTS "variant_accessories_delete" ON variant_accessories;
CREATE POLICY "variant_accessories_delete" ON variant_accessories FOR DELETE USING (
  EXISTS (SELECT 1 FROM variants WHERE variants.id = variant_accessories.variant_id AND variants.tenant_id = get_user_tenant_id())
);

-- ─── QUOTATION_ACCESSORIES: scoped via quotation's tenant ───
DROP POLICY IF EXISTS "quotation_accessories_select" ON quotation_accessories;
CREATE POLICY "quotation_accessories_select" ON quotation_accessories FOR SELECT USING (
  EXISTS (SELECT 1 FROM quotations WHERE quotations.id = quotation_accessories.quotation_id AND quotations.tenant_id = get_user_tenant_id())
);
DROP POLICY IF EXISTS "quotation_accessories_insert" ON quotation_accessories;
CREATE POLICY "quotation_accessories_insert" ON quotation_accessories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM quotations WHERE quotations.id = quotation_accessories.quotation_id AND quotations.tenant_id = get_user_tenant_id())
);
DROP POLICY IF EXISTS "quotation_accessories_delete" ON quotation_accessories;
CREATE POLICY "quotation_accessories_delete" ON quotation_accessories FOR DELETE USING (
  EXISTS (SELECT 1 FROM quotations WHERE quotations.id = quotation_accessories.quotation_id AND quotations.tenant_id = get_user_tenant_id())
);

-- ============================================================
-- ONBOARDING TRIGGER (auth.users -> tenants, branches, profiles)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_branch_id UUID;
  v_tenant_name TEXT;
  v_branch_name TEXT;
  v_branch_address TEXT;
  v_name TEXT;
  v_email TEXT;
BEGIN
  v_name := COALESCE(new.raw_user_meta_data->>'name', 'User');
  v_email := new.email;

  -- Check if this is an employee creation (tenant_id provided in metadata)
  IF new.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    INSERT INTO public.profiles (id, tenant_id, branch_id, role, name, email)
    VALUES (
      new.id, 
      (new.raw_user_meta_data->>'tenant_id')::UUID, 
      NULLIF(new.raw_user_meta_data->>'branch_id', '')::UUID, 
      COALESCE(new.raw_user_meta_data->>'role', 'employee'), 
      v_name, 
      v_email
    );
    RETURN NEW;
  END IF;

  -- Otherwise, it's a new Dealership signup
  v_tenant_name := COALESCE(new.raw_user_meta_data->>'tenant_name', 'My Dealership');
  v_branch_name := COALESCE(new.raw_user_meta_data->>'branch_name', 'HQ Branch');
  v_branch_address := COALESCE(new.raw_user_meta_data->>'branch_address', '');

  -- 1. Create tenant
  INSERT INTO public.tenants (name)
  VALUES (v_tenant_name)
  RETURNING id INTO v_tenant_id;

  -- 2. Create HQ branch
  INSERT INTO public.branches (tenant_id, name, address, is_hq)
  VALUES (v_tenant_id, v_branch_name, v_branch_address, true)
  RETURNING id INTO v_branch_id;

  -- 3. Create profile linked to the user, tenant, and branch
  INSERT INTO public.profiles (id, tenant_id, branch_id, role, name, email)
  VALUES (new.id, v_tenant_id, v_branch_id, 'dealer_admin', v_name, v_email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Helper function to find a user's ID by email ───
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- ─── 13. STORAGE BUCKETS AND POLICIES ───
-- ============================================================

-- Create the "images" bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the "images" bucket
-- Anyone can view the images (since it's a public bucket)
DROP POLICY IF EXISTS "Images are publicly accessible" ON storage.objects;
CREATE POLICY "Images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

-- Only authenticated users can upload images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');

-- Users can delete their own uploaded images (optional but good practice)
DROP POLICY IF EXISTS "Users can update/delete their own images" ON storage.objects;
CREATE POLICY "Users can update/delete their own images" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'images' AND auth.uid() = owner) WITH CHECK (bucket_id = 'images' AND auth.uid() = owner);
