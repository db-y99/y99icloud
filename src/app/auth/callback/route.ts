import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logAction } from '@/lib/actions/audit'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.redirect(`${origin}/login?error=configuration_error`)
    }

    let response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({
            name,
            value,
            path: options?.path ?? '/',
            domain: options?.domain,
            httpOnly: options?.httpOnly ?? true,
            secure: process.env.NODE_ENV === 'production' ? true : (options?.secure ?? false),
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : (options?.sameSite ?? 'lax'),
            maxAge: options?.maxAge,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({
            name,
            value: '',
            path: options?.path ?? '/',
            domain: options?.domain,
            httpOnly: options?.httpOnly ?? true,
            secure: process.env.NODE_ENV === 'production' ? true : (options?.secure ?? false),
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : (options?.sameSite ?? 'lax'),
            maxAge: 0,
          })
        },
      },
    })

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Log successful login
      try {
        await logAction(user.id, user.email || '', "LOGIN_SUCCESS", "User logged in successfully.");
      } catch (logError) {
        // Don't block login if audit log fails
        console.warn("Could not write to audit log, but proceeding with login:", logError);
      }

      // Return response with cookies set
      return response
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}

