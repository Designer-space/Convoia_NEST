"use client";

import axios, { CanceledError } from "axios";
import { API_BASE_URL } from "./config";
import { getAccessToken, setAccessToken } from "./authStore";

/** Shared Axios instance. Cookies (refresh token) are sent automatically. */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/** `/auth/*` calls (login, register, refresh) must never wait on a session. */
const isAuthRequest = (url = "") => url.includes("/auth/");

/**
 * The bookkeeping we attach to a request config: the token it was sent with
 * (`_authToken`) and whether it has already been retried (`_retried`). These
 * live on the config rather than in a side table because axios copies unknown
 * fields into the retried config — that is what stops a retry from looping.
 *
 * @typedef {import("axios").InternalAxiosRequestConfig & {
 *   _authToken?: string | null,
 *   _retried?: boolean,
 * }} TrackedRequestConfig
 */

/**
 * @param {any} config
 * @returns {TrackedRequestConfig}
 */
const tracked = (config) => config;

/** A dead refresh cookie: no amount of retrying will produce a session. */
const isInvalidSession = (error) =>
  error?.response?.status === 401 || error?.response?.status === 403;

// ── Single-flight refresh ────────────────────────────────────────────────────
// Many requests can need a refresh at once (page load, token expiry, several
// tabs); they must share one call rather than each triggering their own.
let refreshPromise = null;

// Bouncing a dead session to /login is a once-per-page-load action.
let sessionExpiredHandled = false;

function handleSessionExpired() {
  if (sessionExpiredHandled) return;
  sessionExpiredHandled = true;
  setAccessToken(null);
  redirectToLogin();
}

export function refreshSession() {
  if (!refreshPromise) {
    const tokenAtStart = getAccessToken();

    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((response) => {
        const nextToken = response.data?.accessToken ?? null;
        if (nextToken) {
          sessionExpiredHandled = false;
          setAccessToken(nextToken);
        }
        return response.data;
      })
      .catch((error) => {
        // Another call (a fresh login, or a refresh in another code path) may
        // have installed a valid token while this one was in flight; a failed
        // refresh must never wipe it.
        const current = getAccessToken();
        const superseded = current !== null && current !== tokenAtStart;

        if (isInvalidSession(error)) {
          if (!superseded) handleSessionExpired();
        }
        // Anything else (a Render cold start timing out, say) is not an expired
        // session: keep the token as it is and let the caller retry later.
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// ── Global 429 handler (set by the app shell to show a cooldown toast) ───────
let onRateLimited = null;
export function setRateLimitHandler(handler) {
  onRateLimited = handler;
}

const AUTH_PAGES = ["/login", "/register"];

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (AUTH_PAGES.includes(window.location.pathname)) return;
  const target = window.location.pathname + window.location.search;
  window.location.href = `/login?redirect=${encodeURIComponent(target)}`;
}

/**
 * Cancel the request instead of sending it anonymously, so no request ever
 * leaves without a session. The original failure is kept as `cause`.
 *
 * @param {any} config
 * @param {unknown} [cause]
 */
function cancelRequest(config, cause) {
  const error = new CanceledError(
    "No authenticated session available — request cancelled",
  );
  error.config = config;
  error.cause = cause ?? undefined;
  return error;
}

api.interceptors.request.use(async (config) => {
  const url = config?.url ?? "";

  // Login/register/refresh: attach whatever token exists and move on. Waiting
  // on a session here would make logging in impossible without a session.
  if (isAuthRequest(url)) {
    const token = getAccessToken();
    tracked(config)._authToken = token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  let token = getAccessToken();

  // After a reload the access token is gone but the refresh cookie is not, so
  // restore the session *before* the request goes out. Sending it anonymously
  // is exactly what produced the 401s (and the extra round trip) on every
  // page load. `refreshSession` is single-flight: N parallel queries share it.
  if (!token) {
    try {
      await refreshSession();
    } catch (error) {
      // Refresh failed: never send an unauthenticated data request.
      throw cancelRequest(config, error);
    }
    token = getAccessToken();
    if (!token) throw cancelRequest(config, null);
  }

  // Remember which token this request was sent with, so the 401 path can tell
  // "this token is stale" apart from "a refresh already finished meanwhile".
  tracked(config)._authToken = token;
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    const url = config?.url ?? "";
    const trackedConfig = config ? tracked(config) : null;

    // 401 => retry once with a usable token.
    if (
      response?.status === 401 &&
      trackedConfig &&
      !trackedConfig._retried &&
      !isAuthRequest(url)
    ) {
      trackedConfig._retried = true;

      const tokenNow = getAccessToken();

      // A refresh (the bootstrap one, a sibling query, another tab) already
      // replaced the token while this request was in flight: retry with that
      // token instead of burning a second refresh.
      if (tokenNow && tokenNow !== trackedConfig._authToken) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${tokenNow}`;
        return api.request(config);
      }

      // The request really did carry the current token, so it is stale.
      try {
        await refreshSession();
        const token = getAccessToken();
        config.headers = config.headers ?? {};
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return api.request(config);
      } catch {
        // `refreshSession` has already dealt with an invalid session; a network
        // failure just fails this request and React Query retries later.
      }
    }

    if (response?.status === 429 && typeof onRateLimited === "function") {
      const retryAfter = Number(response.headers?.["retry-after"] ?? 0);
      onRateLimited(retryAfter * 1000 || 5000);
    }

    return Promise.reject(error);
  },
);

/**
 * Generic API requester.
 * @param {Object} options
 * @param {string} options.url - Relative path, e.g. "/conversations".
 * @param {("GET"|"POST"|"PUT"|"PATCH"|"DELETE")} [options.method="GET"]
 * @param {Object} [options.params]
 * @param {Object|FormData} [options.data]
 * @param {Object} [options.headers]
 * @returns {Promise<any>} response data
 */
export async function apiRequest({ url, method = "GET", params, data, headers }) {
  const response = await api.request({
    url,
    method: method.toUpperCase(),
    params,
    data,
    headers,
  });
  return response.data;
}

/** Convenience helper: does the browser currently hold a refresh session? */
export async function hasSession() {
  try {
    await refreshSession();
    return true;
  } catch {
    return false;
  }
}
