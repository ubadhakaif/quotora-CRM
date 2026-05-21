-- ─── CREATE TABLE employee_attendance ───
CREATE TABLE IF NOT EXISTS employee_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'on_leave')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Ensure one check-in record per date per profile
  UNIQUE(profile_id, date)
);

-- Enable RLS
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

-- Enable updated_at trigger
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON employee_attendance;
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON employee_attendance
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS POLICIES FOR employee_attendance ───

-- 1. Select Policies
-- Employees can view their own records
DROP POLICY IF EXISTS "attendance_select_employee" ON employee_attendance;
CREATE POLICY "attendance_select_employee" ON employee_attendance
  FOR SELECT USING (profile_id = auth.uid());

-- Branch managers can view records for their branch's employees (including their own)
DROP POLICY IF EXISTS "attendance_select_manager" ON employee_attendance;
CREATE POLICY "attendance_select_manager" ON employee_attendance
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'branch_manager' AND
    branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  );

-- Dealer admins can view all records for their tenant
DROP POLICY IF EXISTS "attendance_select_admin" ON employee_attendance;
CREATE POLICY "attendance_select_admin" ON employee_attendance
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'dealer_admin' AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- 2. Insert Policies
-- Employees can check in themselves
DROP POLICY IF EXISTS "attendance_insert_employee" ON employee_attendance;
CREATE POLICY "attendance_insert_employee" ON employee_attendance
  FOR INSERT WITH CHECK (
    profile_id = auth.uid() AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND
    (branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid()) OR (SELECT branch_id FROM profiles WHERE id = auth.uid()) IS NULL)
  );

-- Dealer admins can insert any record for their tenant
DROP POLICY IF EXISTS "attendance_insert_admin" ON employee_attendance;
CREATE POLICY "attendance_insert_admin" ON employee_attendance
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'dealer_admin' AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- 3. Update Policies
-- Employees can update their own checkout
DROP POLICY IF EXISTS "attendance_update_employee" ON employee_attendance;
CREATE POLICY "attendance_update_employee" ON employee_attendance
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- Branch managers can update their branch's employee records
DROP POLICY IF EXISTS "attendance_update_manager" ON employee_attendance;
CREATE POLICY "attendance_update_manager" ON employee_attendance
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'branch_manager' AND
    branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'branch_manager' AND
    branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  );

-- Dealer admins can update any record for their tenant
DROP POLICY IF EXISTS "attendance_update_admin" ON employee_attendance;
CREATE POLICY "attendance_update_admin" ON employee_attendance
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'dealer_admin' AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'dealer_admin' AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );
