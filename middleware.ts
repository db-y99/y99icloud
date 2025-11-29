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
        // Update request cookies first
        request.cookies.set({
          name,
          value,
          ...options,
        })
        
        // Create new response (NextResponse automatically preserves existing cookies)
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        
        // Supabase cookies naming: sb-<project-ref>-auth-token (access token) and sb-<project-ref>-auth-token.0/.1 (refresh token)
        // Refresh token cookies (ending with .0 or .1) need to be accessible from JavaScript
        const isRefreshToken = name.includes('auth-token.0') || name.includes('auth-token.1');
        
        // Security: Set secure cookie options
        // CRITICAL: Preserve path, domain, and other options from Supabase to ensure cookies work correctly
        response.cookies.set({
          name,
          value,
          // Preserve path from Supabase (defaults to '/' if not provided)
          path: options?.path !== undefined ? options.path : '/',
          // Preserve domain from Supabase (important for production)
          domain: options?.domain,
          // Refresh tokens must NOT be httpOnly so browser client can read them
          // Access tokens can be httpOnly for security
          httpOnly: isRefreshToken ? false : (options?.httpOnly !== undefined ? options.httpOnly : true),
          secure: process.env.NODE_ENV === 'production' ? true : (options?.secure !== undefined ? options.secure : false),
          sameSite: process.env.NODE_ENV === 'production' ? 'lax' : (options?.sameSite || 'lax'),
          // Preserve maxAge from Supabase if provided
          maxAge: options?.maxAge,
        })
      },
      remove(name: string, options: any) {
        // Update request cookies first
        request.cookies.set({
          name,
          value: '',
          ...options,
        })
        
        // Create new response (NextResponse automatically preserves existing cookies)
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        
        // Supabase cookies naming: sb-<project-ref>-auth-token (access token) and sb-<project-ref>-auth-token.0/.1 (refresh token)
        const isRefreshToken = name.includes('auth-token.0') || name.includes('auth-token.1');
        
        // Remove the cookie with proper options preserved
        // CRITICAL: Preserve path, domain from original options for proper removal
        response.cookies.set({
          name,
          value: '',
          // Preserve path from Supabase (defaults to '/' if not provided)
          path: options?.path !== undefined ? options.path : '/',
          // Preserve domain from Supabase (important for production)
          domain: options?.domain,
          // Preserve original httpOnly setting for proper cookie removal
          httpOnly: isRefreshToken ? false : (options?.httpOnly !== undefined ? options.httpOnly : true),
          secure: process.env.NODE_ENV === 'production' ? true : (options?.secure !== undefined ? options.secure : false),
          sameSite: process.env.NODE_ENV === 'production' ? 'lax' : (options?.sameSite || 'lax'),
          maxAge: 0, // Remove cookie
        })
      },
    },
  })

  // Refresh session if expired - required for Server Components
  // Only call getUser() once to avoid race conditions with token refresh
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // If there's an auth error (like invalid refresh token), clear session and redirect to login
  if (authError && authError.message?.includes('Refresh Token')) {
    console.warn('Refresh token error in middleware:', authError.message)
    // Clear invalid session
    try {
      await supabase.auth.signOut()
    } catch (signOutError) {
      console.error('Error signing out after refresh token error:', signOutError)
    }
    // Only redirect if not already on login page
    if (!request.nextUrl.pathname.startsWith('/login')) {
      return createSafeRedirect('/login', request)
    }
  }

  // Security: Check if authenticated user's email is in allowed_emails and is_active
  // Chỉ check khi user đã authenticated và không phải là static assets
  if (user && user.email && !request.nextUrl.pathname.startsWith('/_next')) {
    try {
      // Thêm timeout cho database query (3 giây)
      const emailCheckPromise = supabase
        .from('allowed_emails')
        .select('id')
        .eq('email', user.email)
        .eq('is_active', true)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: null }>((_, reject) => {
        setTimeout(() => reject(new Error('Email check timeout')), 3000);
      });

      const { data: allowedEmail } = await Promise.race([
        emailCheckPromise,
        timeoutPromise
      ]) as { data: any };

      if (!allowedEmail) {
        // User's email is not in allowed list or is inactive, sign them out
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('Error signing out in middleware:', signOutError);
        }
        // Redirect to login with error message
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'email_not_allowed');
        return NextResponse.redirect(loginUrl);
      }
    } catch (error: any) {
      // Nếu timeout hoặc lỗi, deny access để an toàn
      if (error?.message === 'Email check timeout') {
        console.warn('Email check timeout in middleware, denying access');
      } else {
        console.error('Error checking email in middleware:', error);
      }
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out in middleware:', signOutError);
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'email_not_allowed');
      return NextResponse.redirect(loginUrl);
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
    try {
      // Thêm timeout cho database query (3 giây)
      const ownerCheckPromise = supabase
        .from('allowed_emails')
        .select('id')
        .eq('email', user.email || '')
        .eq('role', 'owner')
        .eq('is_active', true)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: null }>((_, reject) => {
        setTimeout(() => reject(new Error('Owner check timeout')), 3000);
      });

      const { data: ownerData } = await Promise.race([
        ownerCheckPromise,
        timeoutPromise
      ]) as { data: any };

      if (!ownerData) {
        // User is not an owner, redirect to home
        return createSafeRedirect('/', request);
      }
    } catch (error: any) {
      // Nếu timeout hoặc lỗi, deny access để an toàn
      if (error?.message === 'Owner check timeout') {
        console.warn('Owner check timeout in middleware, denying access');
      } else {
        console.error('Error checking owner in middleware:', error);
      }
      return createSafeRedirect('/', request);
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
