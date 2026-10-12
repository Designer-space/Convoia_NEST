"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, UserPlus, UserCheck, Inbox, LogOut } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { setAccessToken } from "@/lib/authStore";
import { disconnectSockets } from "@/lib/socket";
import { useMe } from "@/hooks/useMe";
import ThemeToggle from "./ThemeToggle";

const AUTH_PAGES = ["/login", "/register"];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useMe();

  if (AUTH_PAGES.includes(pathname)) return null;

  const onSignOut = async () => {
    try {
      await apiRequest({ url: "/auth/logout", method: "POST" });
    } catch {
      // Even if the call fails, clear local state and leave.
    }
    setAccessToken(null);
    disconnectSockets();
    router.push("/login");
  };

  const menu = [
    { name: "Chat", path: "/chat", icon: MessageCircle },
    { name: "Add Friend", path: "/add-friend", icon: UserPlus },
    { name: "Friends", path: "/friends", icon: UserCheck },
    { name: "Friend Requests", path: "/friendrequests", icon: Inbox },
  ];

  return (
    <aside className="flex w-full max-w-64 flex-col justify-between border-r border-t-border bg-t-surface">
      <div className="space-y-1 p-4">
        <h1 className="mb-4 text-xl font-bold text-foreground">Convoia</h1>

        {menu.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-t-primary text-white"
                  : "text-foreground hover:bg-t-hover"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <ThemeToggle />

      <div className="flex items-center gap-3 border-t border-t-border p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user?.avatar || "/profile.webp"}
          alt=""
          className="h-10 w-10 rounded-full object-cover"
        />
        <Link href="/viewprofile" className="w-full">
          <p className="text-sm font-medium text-foreground">{user?.name || "Loading…"}</p>
          <p className="text-xs text-t-muted">View profile</p>
        </Link>
        <button
          onClick={onSignOut}
          aria-label="Sign out"
          className="cursor-pointer text-t-muted hover:text-foreground"
        >
          <LogOut />
        </button>
      </div>
    </aside>
  );
}
