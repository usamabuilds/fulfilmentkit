import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/pricing', '/register', '/verify-email', '/workspaces', '/onboarding']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // JWT lives in Zustand (client only) so we can't check it in middleware.
  // Route protection is handled client-side in the Shell.
  // Middleware only handles redirects we can determine from cookies in future.
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
