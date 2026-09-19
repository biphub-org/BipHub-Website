import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { isOrphanedSession } from '@/lib/auth/deleted-session'

/**
 * Edge middleware for BipHub (Phase 2 + Phase 5).
 *
 * Responsibilities:
 *   1. Refresh the Supabase session cookie on every matched request via getClaims()
 *      -- getClaims validates the JWT signature locally (PITFALLS Pitfall 1).
 *   2. Inject `x-pathname` response header so RSC layouts can read the
 *      current path without parsing referer (Pitfall 2 prevention).
 *   3. Deleted-account kick: JWTs are stateless, so a manually-deleted
 *      auth user keeps passing getClaims() until token expiry. On account
 *      routes (/dashboard, /student-dashboard, /admin) confirm the user
 *      still exists via getUser(); on a positive gone-signal clear the
 *      dead sb-* session cookies and bounce to /login. Fail-open on any
 *      other getUser failure (see lib/auth/deleted-session.ts).
 *   4. D-11 redirect matrix (Phase 5 — student route group):
 *        (3a) !claims && pathname.startsWith('/dashboard') -> /login
 *             role==='student' && pathname.startsWith('/dashboard') -> /student-dashboard
 *        (3b) /admin: !claims -> /login?next=/admin; role!=='admin' -> /
 *        (3d) /student-dashboard: !claims -> /register/student; coordinator -> /dashboard; admin -> /admin
 *        (3c) claims && /login|/register: route by role (student->/student-dashboard, admin->/admin, else->/dashboard)
 *
 * NEVER use the unvalidated session reader -- it does not validate JWT signatures.
 */
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)

  // CRITICAL: getClaims() validates the JWT signature on every request.
  // `data` itself is null when no session exists; destructure carefully.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  const { pathname } = request.nextUrl

  // (2) Inject pathname header for downstream RSC layouts (Pitfall 2 fix).
  response.headers.set('x-pathname', pathname)

  // (3) Deleted-account kick — runs before the role matrix so a dead
  // session never traverses it. Scoped to account routes: public pages
  // show no privileged data, so they skip the extra Auth roundtrip.
  const isAccountRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/student-dashboard') ||
    pathname.startsWith('/admin')
  if (claims && (claims as { sub?: string }).sub && isAccountRoute) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (isOrphanedSession(userData.user, userError)) {
      console.error('[middleware] kicking session of deleted user')
      const loginUrl = new URL('/login', request.url)
      const kicked = NextResponse.redirect(loginUrl)
      // supabase.auth.signOut() would write to the factory's response,
      // not this redirect — clear the session cookies here instead.
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.startsWith('sb-')) kicked.cookies.delete(cookie.name)
      }
      return kicked
    }
    if (userError) {
      console.error('[middleware] getUser failed (non-blocking):', userError.message)
    }
  }

  // (3a) Auth-required: coordinator dashboard.
  if (pathname.startsWith('/dashboard')) {
    if (!claims) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // D-11: student hitting a coordinator route → their own dashboard
    const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
    if (role === 'student') {
      return NextResponse.redirect(new URL('/student-dashboard', request.url))
    }
  }

  // (3b) Admin-required: admin route group.
  // Phase 3 addition: triple-layer guard layer 1 (per 03-RESEARCH.md Pattern 1).
  // - Unauthenticated → /login?next=/admin
  // - Authenticated but role !== 'admin' → / (avoid redirect loop into /login)
  if (pathname.startsWith('/admin')) {
    if (!claims) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', '/admin')
      return NextResponse.redirect(loginUrl)
    }
    const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // (3d) Student route group. /student-dashboard/* IS reached by middleware
  // (NOT excluded by the matcher). D-13 / RESEARCH OQ-2: no matcher change needed —
  // the "DO NOT modify" matcher comment is preserved. layout.tsx provides defense-in-depth.
  if (pathname.startsWith('/student-dashboard')) {
    if (!claims) {
      return NextResponse.redirect(new URL('/register/student', request.url))
    }
    const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
    if (role === 'coordinator') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    // role === 'student' (or null for an in-flight session) → allow through
  }

  // (3c) Already-authenticated: bounce off the auth pages.
  // Note: matcher excludes /login and /register from middleware execution by default
  // (existing config), so this branch only fires if the matcher is later expanded.
  // Kept here for defense-in-depth and clarity if matcher changes in Phase 3+.
  if (claims && (pathname === '/login' || pathname === '/register')) {
    const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
    return NextResponse.redirect(new URL(
      role === 'student' ? '/student-dashboard'
      : role === 'admin'  ? '/admin'
                          : '/dashboard',
      request.url
    ))
  }

  return response
}

// Matcher set in Plan 01-01. DO NOT modify.
export const config = {
  matcher: [
    // Run middleware on every path EXCEPT:
    //   - Next.js internals (_next/static, _next/image)
    //   - favicon
    //   - static asset extensions (svg/png/jpg/jpeg/gif/webp/json -- last one excludes
    //     /eu-countries.json fetched at runtime by <EuropeMap> in Plan 01-05)
    //   - auth routes (login, register, auth/callback) -- Phase 2 routes; excluding
    //     them now prevents the "infinite redirect after login" classic bug
    '/((?!_next/static|_next/image|favicon.ico|login|register|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
}
