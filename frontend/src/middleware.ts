import { NextResponse, NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;

  // Define public routes (auth pages)
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // If user has token and tries to access auth pages, redirect to home
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // If user has no token and tries to access protected routes, redirect to login
  if (!token && !isAuthPage) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};