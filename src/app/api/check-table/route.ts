import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const { data, error } = await supabase
      .from('employee_attendance')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({ exists: false, error: error.message, details: error }, { status: 200 })
    }
    return NextResponse.json({ exists: true, data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
