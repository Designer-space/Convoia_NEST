"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";

export function useMessages(conversationId) {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasToken(!!localStorage.getItem("token"));
    }
  }, []);

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const data = await apiRequest({
        url: `/conversations/${conversationId}/messages`,
        method: "GET",
        params: { limit: 50 },
      });
      return data;
    },
    enabled: hasToken && !!conversationId,
  });
}
