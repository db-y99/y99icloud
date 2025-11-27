import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Security: Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
}

// Security: Helper function to create safe internal redirects (prevents SSRF)
function createSafeRedirect(path: string, request: NextRequest): NextResponse {
  // Only allow redirects to same origin (internal paths)
  const url = new URL(path, request.url)
  const origin = new URL(request.url).origin
  
  // Ensure redirect is to same origin
  if (url.origin !== origin) {
    // If external URL detected, redirect to home instead
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return NextResponse.redirect(url)
}

export async function middleware(request: NextRequest) {
  // Security: Early return if environment variables are missing
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing in middleware')
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        request.cookies.set({
          name,
          value,
          ...options,
        })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        // Security: Set secure cookie options
        response.cookies.set({
          name,
          value,
          ...options,
          // Security: Ensure httpOnly and secure flags are set for auth cookies
          httpOnly: name.includes('auth') || name.includes('sb-') ? true : options?.httpOnly,
          secure: process.env.NODE_ENV === 'production' ? true : options?.secure,
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: name.includes('auth') ? 60 * 60 * 24 * 7 : options?.maxAge, // 7 days for auth cookies
        })
      },
      remove(name: string, options: any) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({
          name,
          value: '',
          ...options,
          // Security: Ensure httpOnly and secure flags are set for auth cookies
          httpOnly: name.includes('auth') || name.includes('sb-') ? true : options?.httpOnly,
          secure: process.env.NODE_ENV === 'production' ? true : options?.secure,
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: name.includes('auth') ? 60 * 60 * 24 * 7 : options?.maxAge, // 7 days for auth cookies
        })
      },
    },
  })

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  // Protect routes that require authentication
  const { data: { user } } = await supabase.auth.getUser()

  // Security: Check if authenticated user's email is in allowed_emails and is_active
  // Chỉ check khi user đã authenticated và không phải là static assets
  if (user && user.email && !request.nextUrl.pathname.startsWith('/_next')) {
    const { data: allowedEmail } = await supabase
      .from('allowed_emails')
      .select('id')
      .eq('email', user.email)
      .eq('is_active', true)
      .maybeSingle()

    if (!allowedEmail) {
      // User's email is not in allowed list or is inactive, sign them out
      await supabase.auth.signOut()
      // Redirect to login with error message
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'email_not_allowed')
      return NextResponse.redirect(loginUrl)
    }
  }

  // Security: Redirect to login if accessing protected routes without authentication
  // Using safe redirect function to prevent SSRF
  if (!user && (
    request.nextUrl.pathname.startsWith('/accounts') ||
    request.nextUrl.pathname.startsWith('/customers') ||
    request.nextUrl.pathname.startsWith('/audit-log') ||
    request.nextUrl.pathname.startsWith('/emails')
  )) {
    return createSafeRedirect('/login', request)
  }

  // Security: Only allow owners to access /emails route
  if (user && request.nextUrl.pathname.startsWith('/emails')) {
    const { data: ownerData } = await supabase
      .from('allowed_emails')
      .select('id')
      .eq('email', user.email || '')
      .eq('role', 'owner')
      .eq('is_active', true)
      .maybeSingle()

    if (!ownerData) {
      // User is not an owner, redirect to home
      return createSafeRedirect('/', request)
    }
  }

  // Security: Redirect to home if accessing login page while authenticated
  if (user && request.nextUrl.pathname === '/login') {
    return createSafeRedirect('/', request)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
