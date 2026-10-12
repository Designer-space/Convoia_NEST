/**
 * Single source of truth for the backend URL.
 *
 * Set `NEXT_PUBLIC_API_BASE_URL` in your environment (e.g. `.env.local`). There
 * is deliberately no hardcoded production URL.
 */
const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export const API_BASE_URL = raw.replace(/\/$/, "");

if (!process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NODE_ENV === "production") {
  // Fail loudly rather than silently pointing production at localhost.
  throw new Error("NEXT_PUBLIC_API_BASE_URL must be set for production builds");
}
