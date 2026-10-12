"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { apiRequest } from "@/lib/api";

const AUTH_PAGES = ["/login", "/register"];

export function useMessages(conversationId) {
  const pathname = usePathname();
  const enabled = !AUTH_PAGES.includes(pathname) && !!conversationId;

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      apiRequest({
        url: `/conversations/${conversationId}/messages`,
        method: "GET",
        params: { limit: 50 },
      }),
    enabled,
  });
}
