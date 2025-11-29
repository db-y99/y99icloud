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
  const url = new URL(path, request.url)
  const origin = new URL(request.url).origin
  
  if (url.origin !== origin) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return NextResponse.redirect(url)
}

// Helper function to check if email is allowed
async function checkEmailAllowed(supabase: ReturnType<typeof createServerClient>, email: string): Promise<boolean> {
  try {
    const emailCheckPromise = supabase
      .from('allowed_emails')
      .select('id, role')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle();

    const timeoutPromise = new Promise<{ data: null }>((_, reject) => {
      setTimeout(() => reject(new Error('Email check timeout')), 3000);
    });

    const { data } = await Promise.race([
      emailCheckPromise,
      timeoutPromise
    ]) as { data: any };

    return !!data;
  } catch (error: any) {
    if (error?.message === 'Email check timeout') {
      console.warn('Email check timeout in middleware');
    } else {
      console.error('Error checking email in middleware:', error);
    }
    return false;
  }
}

// Helper function to check if user is owner
async function checkIsOwner(supabase: ReturnType<typeof createServerClient>, email: string): Promise<boolean> {
  try {
    const ownerCheckPromise = supabase
      .from('allowed_emails')
      .select('id')
      .eq('email', email)
      .eq('role', 'owner')
      .eq('is_active', true)
      .maybeSingle();

    const timeoutPromise = new Promise<{ data: null }>((_, reject) => {
      setTimeout(() => reject(new Error('Owner check timeout')), 3000);
    });

    const { data } = await Promise.race([
      ownerCheckPromise,
      timeoutPromise
    ]) as { data: any };

    return !!data;
  } catch (error: any) {
    if (error?.message === 'Owner check timeout') {
      console.warn('Owner check timeout in middleware');
    } else {
      console.error('Error checking owner in middleware:', error);
    }
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // Security: Early return if environment variables are missing
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing in middleware')
    return NextResponse.next()
  }

  // Skip middleware for static assets
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/_next')) {
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
        request.cookies.set({ name, value, ...options })
        
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        
        const isRefreshToken = name.includes('auth-token.0') || name.includes('auth-token.1');
        
        response.cookies.set({
          name,
          value,
          path: options?.path ?? '/',
          domain: options?.domain,
          httpOnly: isRefreshToken ? false : (options?.httpOnly ?? true),
          secure: process.env.NODE_ENV === 'production' ? true : (options?.secure ?? false),
          sameSite: process.env.NODE_ENV === 'production' ? 'lax' : (options?.sameSite ?? 'lax'),
          maxAge: options?.maxAge,
        })
      },
      remove(name: string, options: any) {
        request.cookies.set({ name, value: '', ...options })
        
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        
        const isRefreshToken = name.includes('auth-token.0') || name.includes('auth-token.1');
        
        response.cookies.set({
          name,
          value: '',
          path: options?.path ?? '/',
          domain: options?.domain,
          httpOnly: isRefreshToken ? false : (options?.httpOnly ?? true),
          secure: process.env.NODE_ENV === 'production' ? true : (options?.secure ?? false),
          sameSite: process.env.NODE_ENV === 'production' ? 'lax' : (options?.sameSite ?? 'lax'),
          maxAge: 0,
        })
      },
    },
  })

  // Get user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Handle auth errors (invalid refresh token, etc.)
  if (authError && authError.message?.includes('Refresh Token')) {
    console.warn('Refresh token error in middleware:', authError.message)
    try {
      await supabase.auth.signOut()
    } catch (signOutError) {
      console.error('Error signing out after refresh token error:', signOutError)
    }
    if (pathname !== '/login') {
      return createSafeRedirect('/login', request)
    }
    return response
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/accounts', '/customers', '/audit-log', '/emails']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // If accessing protected route without authentication, redirect to login
  if (!user && isProtectedRoute) {
    return createSafeRedirect('/login', request)
  }

  // If authenticated, validate email and check permissions
  if (user && user.email) {
    const isEmailAllowed = await checkEmailAllowed(supabase, user.email)
    
    if (!isEmailAllowed) {
      // Email not allowed, sign out and redirect
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        console.error('Error signing out in middleware:', signOutError)
      }
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'email_not_allowed')
      return NextResponse.redirect(loginUrl)
    }

    // Check owner permission for /emails route
    if (pathname.startsWith('/emails')) {
      const isOwner = await checkIsOwner(supabase, user.email)
      if (!isOwner) {
        return createSafeRedirect('/', request)
      }
    }

    // Redirect authenticated users away from login page
    if (pathname === '/login') {
      return createSafeRedirect('/', request)
    }
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
