/**
 * Single source of truth for the backend URLs.
 *
 * In production `NEXT_PUBLIC_API_BASE_URL` is the relative path `/api`, which
 * `next.config.mjs` rewrites to the real backend. Serving the API from the
 * site's own origin is what keeps the HttpOnly refresh cookie first-party, so
 * the browser actually stores it and `src/middleware.ts` can see it.
 *
 * WebSockets cannot go through that rewrite (Vercel's proxy does not upgrade
 * them), so realtime uses `NEXT_PUBLIC_SOCKET_URL`, which must be absolute.
 */
const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const rawSocket = process.env.NEXT_PUBLIC_SOCKET_URL || raw;

export const API_BASE_URL = raw.replace(/\/$/, "");

// Fall back to the API URL, but only ever in a form sockets can actually use.
export const SOCKET_URL = rawSocket.replace(/\/$/, "");

const isProduction = process.env.NODE_ENV === "production";

if (!process.env.NEXT_PUBLIC_API_BASE_URL && isProduction) {
  // Fail loudly rather than silently pointing production at localhost.
  throw new Error("NEXT_PUBLIC_API_BASE_URL must be set for production builds");
}

if (isProduction && !/^https?:\/\//i.test(SOCKET_URL)) {
  // A relative SOCKET_URL means the socket would connect back to the Vercel
  // origin, which cannot proxy WebSocket upgrades.
  throw new Error(
    `NEXT_PUBLIC_SOCKET_URL must be an absolute URL for production builds (got "${SOCKET_URL}")`,
  );
}
