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
CREATE POLICY "tenants_select" ON tenants FOR SELECT USING (
  id = get_user_tenant_id()
);
-- Allow INSERT for new signups (no profile yet, so we must allow)
CREATE POLICY "tenants_insert" ON tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "tenants_update" ON tenants FOR UPDATE USING (
  id = get_user_tenant_id()
);

-- ─── BRANCHES: scoped to tenant ───
CREATE POLICY "branches_select" ON branches FOR SELECT USING (
  tenant_id = get_user_tenant_id()
);
CREATE POLICY "branches_insert" ON branches FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "branches_update" ON branches FOR UPDATE USING (
  tenant_id = get_user_tenant_id()
);
CREATE POLICY "branches_delete" ON branches FOR DELETE USING (
  tenant_id = get_user_tenant_id()
);

-- ─── PROFILES: users can see profiles in their tenant ───
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  tenant_id = get_user_tenant_id() OR id = auth.uid()
);
-- Allow INSERT for onboarding (profile doesn't exist yet)
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  id = auth.uid()
);
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
      'CREATE POLICY "%1$s_select" ON %1$I FOR SELECT USING (tenant_id = get_user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "%1$s_insert" ON %1$I FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "%1$s_update" ON %1$I FOR UPDATE USING (tenant_id = get_user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "%1$s_delete" ON %1$I FOR DELETE USING (tenant_id = get_user_tenant_id())',
      tbl
    );
  END LOOP;
END;
$$;

-- ─── VARIANT_ACCESSORIES: scoped via variant's tenant ───
CREATE POLICY "variant_accessories_select" ON variant_accessories FOR SELECT USING (
  EXISTS (SELECT 1 FROM variants WHERE variants.id = variant_accessories.variant_id AND variants.tenant_id = get_user_tenant_id())
);
CREATE POLICY "variant_accessories_insert" ON variant_accessories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM variants WHERE variants.id = variant_accessories.variant_id AND variants.tenant_id = get_user_tenant_id())
);
CREATE POLICY "variant_accessories_delete" ON variant_accessories FOR DELETE USING (
  EXISTS (SELECT 1 FROM variants WHERE variants.id = variant_accessories.variant_id AND variants.tenant_id = get_user_tenant_id())
);

-- ─── QUOTATION_ACCESSORIES: scoped via quotation's tenant ───
CREATE POLICY "quotation_accessories_select" ON quotation_accessories FOR SELECT USING (
  EXISTS (SELECT 1 FROM quotations WHERE quotations.id = quotation_accessories.quotation_id AND quotations.tenant_id = get_user_tenant_id())
);
CREATE POLICY "quotation_accessories_insert" ON quotation_accessories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM quotations WHERE quotations.id = quotation_accessories.quotation_id AND quotations.tenant_id = get_user_tenant_id())
);
CREATE POLICY "quotation_accessories_delete" ON quotation_accessories FOR DELETE USING (
  EXISTS (SELECT 1 FROM quotations WHERE quotations.id = quotation_accessories.quotation_id AND quotations.tenant_id = get_user_tenant_id())
);
