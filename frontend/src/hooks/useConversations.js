"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";

export function useConversations() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasToken(!!localStorage.getItem("token"));
    }
  }, []);

  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const data = await apiRequest({ url: "/conversations", method: "GET" });
      return data;
    },
    enabled: hasToken,
  });
}
