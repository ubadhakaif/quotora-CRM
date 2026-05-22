-- ─── ADD phone TO profiles ───
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- ─── UPDATE handle_new_user trigger ───
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
  v_phone TEXT;
BEGIN
  v_name := COALESCE(new.raw_user_meta_data->>'name', 'User');
  v_email := new.email;
  v_phone := new.raw_user_meta_data->>'phone';

  -- Check if this is an employee creation (tenant_id provided in metadata)
  IF new.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    INSERT INTO public.profiles (id, tenant_id, branch_id, role, name, email, phone)
    VALUES (
      new.id, 
      (new.raw_user_meta_data->>'tenant_id')::UUID, 
      NULLIF(new.raw_user_meta_data->>'branch_id', '')::UUID, 
      COALESCE(new.raw_user_meta_data->>'role', 'employee'), 
      v_name, 
      v_email,
      v_phone
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
  INSERT INTO public.profiles (id, tenant_id, branch_id, role, name, email, phone)
  VALUES (new.id, v_tenant_id, v_branch_id, 'dealer_admin', v_name, v_email, v_phone);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
