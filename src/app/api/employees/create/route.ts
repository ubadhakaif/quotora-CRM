import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 1. Verify the caller is an authenticated dealer_admin
    const serverSupabase = await createServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Use Admin API (service_role) to bypass RLS and verify the caller's role
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: callerProfile } = await adminSupabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'dealer_admin') {
      return NextResponse.json({ error: 'Forbidden: Only dealer admins can create employees' }, { status: 403 })
    }

    // 3. Parse request body
    const body = await request.json()
    const { email, password, name, role, branch_id } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    // The database trigger "handle_new_user" will automatically create the profile row
    // because we are passing "tenant_id" in the user_metadata.
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        name,
        tenant_id: callerProfile.tenant_id,
        branch_id: branch_id || null,
        role: role || 'employee'
      },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user_id: newUser.user.id,
      user: {
        id: newUser.user.id
      }
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
