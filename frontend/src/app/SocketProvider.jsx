"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import { refreshSession, setRateLimitHandler } from "@/lib/api";
import { updateSocketAuth } from "@/lib/socket";
import { useAccessToken } from "@/hooks/useAccessToken";
import useNotifications from "@/hooks/useNotifications";

const AUTH_PAGES = ["/login", "/register"];

// Session restore should only be attempted once per page load.
let bootstrapped = false;

export default function SocketProvider({ children }) {
  const pathname = usePathname();
  const token = useAccessToken();

  // Silently exchange the refresh cookie for a fresh access token on load.
  useEffect(() => {
    if (bootstrapped || AUTH_PAGES.includes(pathname)) return;
    bootstrapped = true;
    refreshSession().catch(() => {});
  }, [pathname]);

  // Global rate-limit feedback (429 => countdown toast, no retry storm).
  useEffect(() => {
    setRateLimitHandler((cooldownMs) => {
      toast.warn(`Slow down — try again in ${Math.ceil(cooldownMs / 1000)}s`);
    });
  }, []);

  // Keep live sockets authenticated as tokens rotate.
  useEffect(() => {
    if (token) updateSocketAuth();
  }, [token]);

  useNotifications();

  return <>{children}</>;
}
