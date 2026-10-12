"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { apiRequest } from "@/lib/api";

const AUTH_PAGES = ["/login", "/register"];

export function useConversations() {
  const pathname = usePathname();
  const enabled = !AUTH_PAGES.includes(pathname);

  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiRequest({ url: "/conversations", method: "GET" }),
    enabled,
  });
}
