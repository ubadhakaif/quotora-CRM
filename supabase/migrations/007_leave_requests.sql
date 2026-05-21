-- ─── LEAVE REQUESTS TABLE ───
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('casual', 'sick', 'earned', 'compensatory', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Enable updated_at trigger
DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS POLICIES ───

-- Select: Employees see own requests
DROP POLICY IF EXISTS "leave_select_employee" ON leave_requests;
CREATE POLICY "leave_select_employee" ON leave_requests
  FOR SELECT USING (profile_id = auth.uid());

-- Select: Branch managers see their branch's requests
DROP POLICY IF EXISTS "leave_select_manager" ON leave_requests;
CREATE POLICY "leave_select_manager" ON leave_requests
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'branch_manager' AND
    branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  );

-- Select: Dealer admins see all tenant requests
DROP POLICY IF EXISTS "leave_select_admin" ON leave_requests;
CREATE POLICY "leave_select_admin" ON leave_requests
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'dealer_admin' AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Insert: Employees insert their own requests
DROP POLICY IF EXISTS "leave_insert_employee" ON leave_requests;
CREATE POLICY "leave_insert_employee" ON leave_requests
  FOR INSERT WITH CHECK (
    profile_id = auth.uid() AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND
    (branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid()) OR (SELECT branch_id FROM profiles WHERE id = auth.uid()) IS NULL)
  );

-- Insert: Admin can insert for any tenant employee
DROP POLICY IF EXISTS "leave_insert_admin" ON leave_requests;
CREATE POLICY "leave_insert_admin" ON leave_requests
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'dealer_admin' AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Update: Employees can cancel their own pending requests
DROP POLICY IF EXISTS "leave_update_employee" ON leave_requests;
CREATE POLICY "leave_update_employee" ON leave_requests
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- Update: Branch managers can approve/reject their branch's requests
DROP POLICY IF EXISTS "leave_update_manager" ON leave_requests;
CREATE POLICY "leave_update_manager" ON leave_requests
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'branch_manager' AND
    branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'branch_manager' AND
    branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  );

-- Update: Dealer admins can approve/reject any tenant request
DROP POLICY IF EXISTS "leave_update_admin" ON leave_requests;
CREATE POLICY "leave_update_admin" ON leave_requests
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'dealer_admin' AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'dealer_admin' AND
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );
