"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";

export function useMe() {
  const [hasToken, setHasToken] = useState(false);

  // Check for token only on client side to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasToken(!!localStorage.getItem("token"));
    }
  }, []);

  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const data = await apiRequest({ url: "/user/myprofile" });
      return data.user;
    },
    enabled: hasToken,
  });
}