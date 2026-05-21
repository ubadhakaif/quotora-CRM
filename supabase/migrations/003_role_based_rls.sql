-- ============================================================
-- 003 — Role-Based RLS Policies
-- Fine-grained data access for Branch Managers and Sales Execs
-- ============================================================

-- ─── Helper Functions ───

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- RESTRICT ADMIN-ONLY TABLES (Catalog, Branches, Settings, etc.)
-- ============================================================
-- These tables should be read-only for branch_manager and employee.
-- The generic tenant_id policies from 001/002 allowed full CRUD for anyone in the tenant.
-- We will redefine INSERT/UPDATE/DELETE to require 'dealer_admin'.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'categories', 'models', 'fuel_types', 'transmission_types',
      'variants', 'accessory_types', 'accessories',
      'branches', 'finance_providers', 'finance_plans', 'dealership_settings',
      'notification_templates', 'quotation_templates'
    ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "%1$s_insert" ON %1$I; CREATE POLICY "%1$s_insert" ON %1$I FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() = ''dealer_admin'');',
      tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "%1$s_update" ON %1$I; CREATE POLICY "%1$s_update" ON %1$I FOR UPDATE USING (tenant_id = get_user_tenant_id() AND get_user_role() = ''dealer_admin'');',
      tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "%1$s_delete" ON %1$I; CREATE POLICY "%1$s_delete" ON %1$I FOR DELETE USING (tenant_id = get_user_tenant_id() AND get_user_role() = ''dealer_admin'');',
      tbl
    );
  END LOOP;
END;
$$;

-- Specific fixes for `branches` since it has an exception for onboarding in 001
DROP POLICY IF EXISTS "branches_insert" ON branches;
CREATE POLICY "branches_insert" ON branches FOR INSERT WITH CHECK (
  (tenant_id = get_user_tenant_id() AND get_user_role() = 'dealer_admin')
  OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) -- onboarding
);

-- Specific fixes for `variant_accessories` since it doesn't have tenant_id directly
DROP POLICY IF EXISTS "variant_accessories_insert" ON variant_accessories;
CREATE POLICY "variant_accessories_insert" ON variant_accessories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM variants WHERE variants.id = variant_accessories.variant_id AND variants.tenant_id = get_user_tenant_id())
  AND get_user_role() = 'dealer_admin'
);

DROP POLICY IF EXISTS "variant_accessories_update" ON variant_accessories;
CREATE POLICY "variant_accessories_update" ON variant_accessories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM variants WHERE variants.id = variant_accessories.variant_id AND variants.tenant_id = get_user_tenant_id())
  AND get_user_role() = 'dealer_admin'
);

DROP POLICY IF EXISTS "variant_accessories_delete" ON variant_accessories;
CREATE POLICY "variant_accessories_delete" ON variant_accessories FOR DELETE USING (
  EXISTS (SELECT 1 FROM variants WHERE variants.id = variant_accessories.variant_id AND variants.tenant_id = get_user_tenant_id())
  AND get_user_role() = 'dealer_admin'
);


-- ============================================================
-- PROFILES (Branch managers can only see their branch's profiles)
-- ============================================================

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid()
  OR (tenant_id = get_user_tenant_id() AND get_user_role() = 'dealer_admin')
  OR (tenant_id = get_user_tenant_id() AND get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid()
  OR (tenant_id = get_user_tenant_id() AND get_user_role() = 'dealer_admin')
  OR (tenant_id = get_user_tenant_id() AND get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
);


-- ============================================================
-- CUSTOMERS (CRM)
-- ============================================================

DROP POLICY IF EXISTS "customers_select" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT USING (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND branch_id = get_user_branch_id()) -- employees can see branch customers read-only
  )
);

DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND assigned_to = auth.uid()) -- employee only updates their own
  )
);

DROP POLICY IF EXISTS "customers_insert" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND branch_id = get_user_branch_id())
  )
);


-- ============================================================
-- QUOTATIONS & EXCHANGE VEHICLES
-- ============================================================

DROP POLICY IF EXISTS "quotations_select" ON quotations;
CREATE POLICY "quotations_select" ON quotations FOR SELECT USING (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND created_by = auth.uid()) -- employee only sees their own quotes
  )
);

DROP POLICY IF EXISTS "quotations_update" ON quotations;
CREATE POLICY "quotations_update" ON quotations FOR UPDATE USING (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS "quotations_insert" ON quotations;
CREATE POLICY "quotations_insert" ON quotations FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND branch_id = get_user_branch_id())
  )
);

-- Quotation accessories inherit quotation visibility via tenant_id + quotation lookup
-- It's safe to leave as-is from 001 (checks if quotation exists in tenant)
-- For better security, we can explicitly tie it to quotation access:
DROP POLICY IF EXISTS "quotation_accessories_select" ON quotation_accessories;
CREATE POLICY "quotation_accessories_select" ON quotation_accessories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quotations 
    WHERE id = quotation_id 
    AND tenant_id = get_user_tenant_id()
    AND (
      get_user_role() = 'dealer_admin'
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
      OR (get_user_role() = 'employee' AND created_by = auth.uid())
    )
  )
);
DROP POLICY IF EXISTS "quotation_accessories_insert" ON quotation_accessories;
CREATE POLICY "quotation_accessories_insert" ON quotation_accessories FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotations 
    WHERE id = quotation_id 
    AND tenant_id = get_user_tenant_id()
    AND (
      get_user_role() = 'dealer_admin'
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
      OR (get_user_role() = 'employee' AND created_by = auth.uid())
    )
  )
);
DROP POLICY IF EXISTS "quotation_accessories_delete" ON quotation_accessories;
CREATE POLICY "quotation_accessories_delete" ON quotation_accessories FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM quotations 
    WHERE id = quotation_id 
    AND tenant_id = get_user_tenant_id()
    AND (
      get_user_role() = 'dealer_admin'
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
      OR (get_user_role() = 'employee' AND created_by = auth.uid())
    )
  )
);

-- Same for exchange vehicles (scoped to quotation)
DROP POLICY IF EXISTS "exchange_vehicles_select" ON exchange_vehicles;
CREATE POLICY "exchange_vehicles_select" ON exchange_vehicles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quotations 
    WHERE id = quotation_id 
    AND tenant_id = get_user_tenant_id()
    AND (
      get_user_role() = 'dealer_admin'
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
      OR (get_user_role() = 'employee' AND created_by = auth.uid())
    )
  )
);
DROP POLICY IF EXISTS "exchange_vehicles_insert" ON exchange_vehicles;
CREATE POLICY "exchange_vehicles_insert" ON exchange_vehicles FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotations 
    WHERE id = quotation_id 
    AND tenant_id = get_user_tenant_id()
    AND (
      get_user_role() = 'dealer_admin'
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
      OR (get_user_role() = 'employee' AND created_by = auth.uid())
    )
  )
);


-- ============================================================
-- FOLLOW-UPS & LEADS & CUSTOMER NOTES
-- ============================================================

-- Follow-ups
DROP POLICY IF EXISTS "follow_ups_select" ON follow_ups;
CREATE POLICY "follow_ups_select" ON follow_ups FOR SELECT USING (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND assigned_to = auth.uid())
  )
);

DROP POLICY IF EXISTS "follow_ups_update" ON follow_ups;
CREATE POLICY "follow_ups_update" ON follow_ups FOR UPDATE USING (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND assigned_to = auth.uid())
  )
);

DROP POLICY IF EXISTS "follow_ups_insert" ON follow_ups;
CREATE POLICY "follow_ups_insert" ON follow_ups FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND branch_id = get_user_branch_id())
  )
);

-- Leads
DROP POLICY IF EXISTS "leads_select" ON leads;
CREATE POLICY "leads_select" ON leads FOR SELECT USING (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND assigned_to = auth.uid())
  )
);
DROP POLICY IF EXISTS "leads_update" ON leads;
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND assigned_to = auth.uid())
  )
);
DROP POLICY IF EXISTS "leads_insert" ON leads;
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() AND
  (
    get_user_role() = 'dealer_admin'
    OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    OR (get_user_role() = 'employee' AND branch_id = get_user_branch_id())
  )
);

-- Customer Notes
DROP POLICY IF EXISTS "customer_notes_select" ON customer_notes;
CREATE POLICY "customer_notes_select" ON customer_notes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM customers
    WHERE id = customer_id
    AND tenant_id = get_user_tenant_id()
    AND (
      get_user_role() = 'dealer_admin'
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
      OR (get_user_role() = 'employee' AND branch_id = get_user_branch_id())
    )
  )
);
DROP POLICY IF EXISTS "customer_notes_insert" ON customer_notes;
CREATE POLICY "customer_notes_insert" ON customer_notes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers
    WHERE id = customer_id
    AND tenant_id = get_user_tenant_id()
    AND (
      get_user_role() = 'dealer_admin'
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
      OR (get_user_role() = 'employee' AND branch_id = get_user_branch_id())
    )
  )
);
