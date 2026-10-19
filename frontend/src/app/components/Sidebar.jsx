"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  LogOut,
  MessageCircle,
  UserCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { setAccessToken } from "@/lib/authStore";
import { disconnectSockets } from "@/lib/socket";
import { useMe } from "@/hooks/useMe";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import Wordmark from "./Wordmark";

const AUTH_PAGES = ["/login", "/register"];

const SECTIONS = [
  { name: "Chat", path: "/chat", icon: MessageCircle },
  { name: "Friends", path: "/friends", icon: UserCheck },
  { name: "Add friend", path: "/add-friend", icon: UserPlus },
  { name: "Requests", path: "/friendrequests", icon: Inbox },
];

const TAB_LABELS = {
  "/chat": "Chat",
  "/friends": "Friends",
  "/add-friend": "Add",
  "/friendrequests": "Requests",
};

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

  const isActive = (path) =>
    pathname === path || (path === "/chat" && pathname.startsWith("/chat"));

  const tabs = [
    ...SECTIONS.map((item) => ({ ...item, label: TAB_LABELS[item.path] })),
    { name: "Profile", path: "/viewprofile", icon: UserRound, label: "You" },
  ];

  return (
    <>
      {/* Phones: the shell is a top bar and a tab bar. */}
      <header className="flex items-center justify-between gap-3 border-b border-t-border bg-t-surface px-4 py-2.5 md:hidden">
        <Wordmark />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-t-muted transition-colors hover:bg-t-hover hover:text-foreground"
          >
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Desktop: the rail. */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-t-border bg-t-surface md:flex">
        <div className="flex items-center justify-between gap-2 px-4 py-3.5">
          <Wordmark />
          <ThemeToggle />
        </div>

        <nav aria-label="Sections" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
          {SECTIONS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-t-hover font-semibold text-foreground"
                    : "font-medium text-t-muted hover:bg-t-hover hover:text-foreground"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full ${
                    active ? "bg-t-primary" : "bg-transparent"
                  }`}
                />
                <Icon size={18} aria-hidden="true" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-t-border p-3">
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatar} size={36} />
            <Link
              href="/viewprofile"
              className="min-w-0 flex-1 rounded-lg px-1 py-1 transition-colors hover:bg-t-hover"
            >
              <span className="block truncate text-[13px] font-semibold text-foreground">
                {user?.name || "Loading…"}
              </span>
              <span className="block truncate text-xs text-t-muted">
                {user?.username ? `@${user.username}` : "View profile"}
              </span>
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-muted transition-colors hover:bg-t-hover hover:text-foreground"
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Phones: bottom tabs. Fixed, and main reserves space for them. */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-t-border bg-t-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <Link
              key={tab.path}
              href={tab.path}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                active ? "font-semibold text-t-primary" : "font-medium text-t-muted"
              }`}
            >
              <Icon size={19} aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
