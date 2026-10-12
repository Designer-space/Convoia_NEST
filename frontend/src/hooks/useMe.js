"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { apiRequest } from "@/lib/api";

const AUTH_PAGES = ["/login", "/register"];

export function useMe() {
  const pathname = usePathname();
  const enabled = !AUTH_PAGES.includes(pathname);

  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const data = await apiRequest({ url: "/user/myprofile" });
      return data.user;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
