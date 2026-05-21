-- ============================================================
-- 002 — Multi-Portal Schema Additions
-- New tables + column additions for Branch Manager & Sales portals
-- ============================================================

-- ─── 1. FOLLOW-UPS ───
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  outcome TEXT CHECK (outcome IN ('interested', 'not_interested', 'call_later', 'no_answer')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. CUSTOMER NOTES ───
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general' CHECK (note_type IN ('call', 'visit', 'email', 'general')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. LEADS ───
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'hot', 'warm', 'cold', 'converted', 'lost')),
  source TEXT NOT NULL DEFAULT 'walk-in' CHECK (source IN ('walk-in', 'phone', 'web', 'referral')),
  priority INTEGER DEFAULT 0,
  escalated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. EXCHANGE VEHICLES ───
CREATE TABLE IF NOT EXISTS exchange_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  kms_driven INTEGER,
  condition TEXT DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  estimated_value NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. FINANCE PROVIDERS ───
CREATE TABLE IF NOT EXISTS finance_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 6. FINANCE PLANS ───
CREATE TABLE IF NOT EXISTS finance_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES finance_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_tenure_months INTEGER NOT NULL DEFAULT 12,
  max_tenure_months INTEGER NOT NULL DEFAULT 84,
  interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  processing_fee_percent NUMERIC(5, 2) DEFAULT 0,
  min_down_payment_percent NUMERIC(5, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. DEALERSHIP SETTINGS (key-value store) ───
CREATE TABLE IF NOT EXISTS dealership_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 8. NOTIFICATION TEMPLATES (scaffolded, left empty) ───
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email' CHECK (type IN ('email', 'sms', 'whatsapp')),
  subject TEXT,
  body_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 9. QUOTATION TEMPLATES ───
CREATE TABLE IF NOT EXISTS quotation_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_config JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 10. INVENTORY (scaffolded, left empty) ───
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  vin TEXT,
  color TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'incoming')),
  expected_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- COLUMN ADDITIONS TO EXISTING TABLES
-- ============================================================

-- ─── QUOTATIONS: discount, approval, notes, pdf, tax ───
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'none' CHECK (approval_status IN ('none', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS tax_breakdown JSONB DEFAULT '{}'::jsonb;

-- ─── CUSTOMERS: lead status, assignment, source ───
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'new' CHECK (lead_status IN ('new', 'hot', 'warm', 'cold', 'converted', 'lost')),
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'walk-in';

-- ─── PROFILES: permissions JSONB ───
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;


-- ============================================================
-- INDEXES
-- ============================================================

-- follow_ups
CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_branch ON follow_ups(branch_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned ON follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);

-- customer_notes
CREATE INDEX IF NOT EXISTS idx_customer_notes_tenant ON customer_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_by ON customer_notes(created_by);

-- leads
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_branch ON leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_customer ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- exchange_vehicles
CREATE INDEX IF NOT EXISTS idx_exchange_vehicles_tenant ON exchange_vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_vehicles_quotation ON exchange_vehicles(quotation_id);

-- finance_providers
CREATE INDEX IF NOT EXISTS idx_finance_providers_tenant ON finance_providers(tenant_id);

-- finance_plans
CREATE INDEX IF NOT EXISTS idx_finance_plans_tenant ON finance_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_plans_provider ON finance_plans(provider_id);

-- dealership_settings — unique key per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_dealership_settings_tenant_key ON dealership_settings(tenant_id, key);

-- notification_templates
CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant ON notification_templates(tenant_id);

-- quotation_templates
CREATE INDEX IF NOT EXISTS idx_quotation_templates_tenant ON quotation_templates(tenant_id);

-- inventory
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch ON inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);

-- Modified columns on existing tables
CREATE INDEX IF NOT EXISTS idx_customers_lead_status ON customers(lead_status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quotations_approval_status ON quotations(approval_status);
CREATE INDEX IF NOT EXISTS idx_quotations_approved_by ON quotations(approved_by);


-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER (for new tables with updated_at)
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'follow_ups', 'leads', 'finance_providers', 'finance_plans',
      'dealership_settings', 'notification_templates', 'quotation_templates', 'inventory'
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
-- ROW LEVEL SECURITY — Enable + tenant-scoped policies
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealership_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Apply standard tenant-scoped CRUD policies to all new tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'follow_ups', 'customer_notes', 'leads', 'exchange_vehicles',
      'finance_providers', 'finance_plans', 'dealership_settings',
      'notification_templates', 'quotation_templates', 'inventory'
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
