"use client";

import axios from "axios";
import { API_BASE_URL } from "./config";
import { getAccessToken, setAccessToken } from "./authStore";

/** Shared Axios instance. Cookies (refresh token) are sent automatically. */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Single-flight refresh ────────────────────────────────────────────────────
// Many requests can 401 at once after the access token expires; they must share
// one refresh call rather than each triggering their own.
let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((response) => {
        setAccessToken(response.data?.accessToken ?? null);
        return response.data;
      })
      .catch((error) => {
        setAccessToken(null);
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

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  const target = window.location.pathname + window.location.search;
  window.location.href = `/login?redirect=${encodeURIComponent(target)}`;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    const url = config?.url ?? "";

    // 401 => try one silent refresh, then retry the original request once.
    const isAuthEndpoint = url.includes("/auth/");
    if (response?.status === 401 && config && !config._retried && !isAuthEndpoint) {
      config._retried = true;
      try {
        await refreshSession();
        const token = getAccessToken();
        config.headers = config.headers ?? {};
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return api.request(config);
      } catch {
        redirectToLogin();
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
