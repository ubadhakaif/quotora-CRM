import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getHomeRoute, canAccessRoute, type Role } from '@/lib/permissions'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = ['/sign-in', '/sign-up', '/']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith('/auth/')
  )

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  // If user is signed in, handle role-based routing
  if (user) {
    const pathname = request.nextUrl.pathname

    // Redirect from sign-in/sign-up to the correct portal
    if (pathname === '/sign-in' || pathname === '/sign-up') {
      // Fetch profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = (profile?.role as Role) || 'employee'
      const url = request.nextUrl.clone()
      url.pathname = getHomeRoute(role)
      return NextResponse.redirect(url)
    }

    // Enforce portal boundaries for protected routes
    const isPortalRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/branch') || pathname.startsWith('/sales')
    
    if (isPortalRoute) {
      // Fetch profile to check role access
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = (profile?.role as Role) || 'employee'

      if (!canAccessRoute(role, pathname)) {
        // Redirect to the user's correct portal
        const url = request.nextUrl.clone()
        url.pathname = getHomeRoute(role)
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
