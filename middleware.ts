import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

/**
 * Edge middleware for BipHub (Phase 2 + Phase 5).
 *
 * Responsibilities:
 *   1. Refresh the Supabase session cookie on every matched request via getClaims()
 *      -- getClaims validates the JWT signature locally (PITFALLS Pitfall 1).
 *   2. Inject `x-pathname` response header so RSC layouts (notably the
 *      (dashboard) layout's profile-complete gate) can read the current path
 *      without parsing referer (Pitfall 2 prevention).
 *   3. D-11 redirect matrix (Phase 5 — student route group):
 *        (3a) !claims && pathname.startsWith('/dashboard' | '/onboarding') -> /login
 *             role==='student' && pathname.startsWith('/dashboard' | '/onboarding') -> /student-dashboard
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

  // (3a) Auth-required: dashboard + onboarding.
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
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
