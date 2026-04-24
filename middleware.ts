import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const auth = request.cookies.get('auth')?.value
  const validPassword = process.env.SITE_PASSWORD

  if (!validPassword) {
    // No password set — fail closed in production, allow in dev
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('SITE_PASSWORD not configured', { status: 500 })
    }
    return NextResponse.next()
  }

  if (auth !== validPassword) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    // Pages redirect to login
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
