"use client";

/**
 * The access token lives in memory only. Persistence across reloads comes from
 * the HttpOnly refresh cookie, which the browser sends automatically — see
 * `refreshSession` in `lib/api.js`.
 */
let accessToken = null;
const listeners = new Set();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token ?? null;
  listeners.forEach((listener) => listener(accessToken));
}

export function subscribeToToken(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** JWT segments are base64url (and unpadded), so convert before decoding. */
function decodeBase64Url(segment) {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  return globalThis.atob(base64.padEnd(base64.length + padding, "="));
}

/**
 * Read the claims out of a JWT without verifying it. The payload is only used
 * for scheduling client-side refresh; the server stays the authority, so an
 * unverifiable/garbage token simply yields `null`.
 */
export function decodeJwtPayload(token) {
  if (typeof token !== "string") return null;
  const segment = token.split(".")[1];
  if (!segment) return null;
  try {
    return JSON.parse(decodeBase64Url(segment));
  } catch {
    return null;
  }
}

/**
 * Absolute time (ms since epoch) at which the given token expires, or `null`
 * when there is no token or it does not carry a usable `exp` claim.
 *
 * @param {string|null} [token] Defaults to the token currently held in memory.
 * @returns {number|null}
 */
export function getTokenExpiry(token = accessToken) {
  const exp = Number(decodeJwtPayload(token)?.exp);
  return Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
}

/**
 * How long the given token was issued for, in ms, or `null` when the `iat`
 * claim is missing. Callers use this to scale their refresh window for short
 * lived tokens (a one minute TTL in local testing, for instance).
 *
 * @param {string|null} [token] Defaults to the token currently held in memory.
 * @returns {number|null}
 */
export function getTokenTtl(token = accessToken) {
  const claims = decodeJwtPayload(token);
  const issuedAt = Number(claims?.iat);
  const expiry = getTokenExpiry(token);
  if (!expiry || !Number.isFinite(issuedAt) || issuedAt <= 0) return null;
  const ttl = expiry - issuedAt * 1000;
  return ttl > 0 ? ttl : null;
}
