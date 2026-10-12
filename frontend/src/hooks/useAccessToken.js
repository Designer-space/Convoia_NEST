"use client";

import { useEffect, useState } from "react";
import { getAccessToken, subscribeToToken } from "@/lib/authStore";

/** React binding for the in-memory access token store. */
export function useAccessToken() {
  const [token, setToken] = useState(() => getAccessToken());

  useEffect(() => subscribeToToken(setToken), []);

  return token;
}
