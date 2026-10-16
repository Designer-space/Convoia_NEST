"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import { refreshSession, setRateLimitHandler } from "@/lib/api";
import {
  getAccessToken,
  getTokenExpiry,
  getTokenTtl,
} from "@/lib/authStore";
import { updateSocketAuth } from "@/lib/socket";
import { useAccessToken } from "@/hooks/useAccessToken";
import useNotifications from "@/hooks/useNotifications";

const AUTH_PAGES = ["/login", "/register"];

// Renew this long before the access token actually expires, so requests
// already in flight never race the expiry.
const REFRESH_SKEW_MS = 60 * 1000;

// Never schedule a renewal sooner than this.
const MIN_RENEWAL_DELAY_MS = 1000;

/**
 * How early to renew a token: the skew, except on tokens that live for less
 * than twice the skew (JWT_ACCESS_TTL=1m in local testing, say) where waiting
 * the full skew would renew in a loop. Half the lifetime is the compromise.
 */
function renewalSkew(token) {
  const ttl = getTokenTtl(token);
  return ttl ? Math.min(REFRESH_SKEW_MS, Math.floor(ttl / 2)) : REFRESH_SKEW_MS;
}

// Session restore should only be attempted once per page load.
let bootstrapped = false;

export default function SocketProvider({ children }) {
  const pathname = usePathname();
  const token = useAccessToken();
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // Silently exchange the refresh cookie for a fresh access token on load.
  useEffect(() => {
    if (bootstrapped || isAuthPage) return;
    bootstrapped = true;
    // The data queries bootstrap this same session when they mount; a token
    // here means one of them already did, so don't spend a second refresh.
    if (getAccessToken()) return;
    refreshSession().catch(() => {});
  }, [isAuthPage]);

  // Global rate-limit feedback (429 => countdown toast, no retry storm).
  useEffect(() => {
    setRateLimitHandler((cooldownMs) => {
      toast.warn(`Slow down — try again in ${Math.ceil(cooldownMs / 1000)}s`);
    });
  }, []);

  // Renew ahead of expiry instead of waiting for the next request to 401. The
  // timer is re-armed whenever a token arrives or rotates, and cleared on
  // unmount (and while on the auth pages).
  useEffect(() => {
    if (isAuthPage) return;
    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const delay = Math.max(
      expiry - Date.now() - renewalSkew(token),
      MIN_RENEWAL_DELAY_MS,
    );
    const timer = setTimeout(() => refreshSession().catch(() => {}), delay);
    return () => clearTimeout(timer);
  }, [token, isAuthPage]);

  // A tab left open (or a laptop that was asleep) can come back with an expired
  // token; check the clock instead of firing a request that would 401 first.
  useEffect(() => {
    if (isAuthPage) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const expiry = getTokenExpiry();
      const stillFresh =
        expiry && expiry - Date.now() > renewalSkew(getAccessToken());
      if (stillFresh) return;
      refreshSession().catch(() => {});
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isAuthPage]);

  // Keep live sockets authenticated as tokens rotate.
  useEffect(() => {
    if (token) updateSocketAuth();
  }, [token]);

  useNotifications();

  return <>{children}</>;
}
