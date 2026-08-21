import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Edge-runtime Supabase client factory for middleware.ts.
 *
 * CONTRACT (do NOT diverge):
 *   1. Cookies are read from `request.cookies` and written to BOTH
 *      `request.cookies` (so Server Components in the same request see fresh
 *      cookies) AND `response.cookies` (so the browser receives them on the
 *      next request). Missing either side breaks auth silently.
 *   2. Returns `{ supabase, response }`. The middleware MUST return that
 *      response object (not a fresh one) -- otherwise the cookies it just
 *      wrote are dropped.
 *   3. Callers MUST use `supabase.auth.getClaims()`, NEVER `getSession()`.
 *      `getClaims()` validates the JWT signature; `getSession()` trusts
 *      cookies blindly (PITFALLS Pitfall 1).
 *
 * Differs from `lib/supabase/server.ts` because middleware runs at the Edge
 * with a NextRequest object instead of next/headers cookies(). Pattern from
 * ARCHITECTURE.md lines 388-457 verbatim.
 */
export function createMiddlewareClient(request: NextRequest): {
  supabase: ReturnType<typeof createServerClient>
  response: NextResponse
} {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          // Write to request so Server Components in this same request see fresh cookies
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // Re-create response with the request that now has the new cookies set
          response = NextResponse.next({ request })
          // Mirror cookies onto response so the BROWSER receives them on the next request
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  return { supabase, response }
}
