import { NextResponse, NextRequest } from "next/server";

/**
 * Route protection based on the HttpOnly refresh cookie.
 *
 * The access token is never stored in a cookie or localStorage anymore, so the
 * only server-visible signal of a session is the refresh cookie set by the API.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("refresh_token")?.value);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  // Signed-in users shouldn't see the auth pages.
  if (hasSession && isAuthPage) {
    const redirect = req.nextUrl.searchParams.get("redirect");
    return NextResponse.redirect(new URL(redirect || "/chat", req.url));
  }

  // Everyone else needs a session for protected routes.
  if (!hasSession && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static assets. `/api/` is excluded because those
    // requests are rewritten to the backend; intercepting them would turn the
    // login POST into a redirect to /login for anyone without a session yet.
    "/((?!api/|_next/static|_next/image|favicon.ico).*)",
  ],
};
