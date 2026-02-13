"use client";

import useNotifications  from "@/hooks/useNotifications";

export default function Providers({ children }) {
  useNotifications()

  return <>{children}</>;
}
