import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
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
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
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
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  
  // Pattern to match /[slug]/admin and /[slug]/admin/anything
  // This regex matches a path that starts with a slash, then any non-slash chars (the slug), then /admin
  const adminPattern = /^\/([^\/]+)\/admin(\/.*)?$/
  const match = pathname.match(adminPattern)

  if (match) {
    const slug = match[1]
    const isLoginPath = pathname.endsWith('/admin/login')

    if (!user && !isLoginPath) {
      // Redirect to specific restaurant login
      return NextResponse.redirect(new URL(`/${slug}/admin/login`, request.nextUrl.origin))
    }
    
    if (user && isLoginPath) {
      // Already logged in, go to dashboard
      return NextResponse.redirect(new URL(`/${slug}/admin`, request.nextUrl.origin))
    }
  }

  // Handle the old /admin and /admin/login routes if they still exist or are hit
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!user && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.nextUrl.origin))
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
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
