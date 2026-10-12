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
