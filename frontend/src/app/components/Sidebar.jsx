"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  UserPlus,
  UserCheck,
  Inbox,
  LogOut,
} from "lucide-react";
import { useMe } from "@/hooks/useMe";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar() {
  const pathname = usePathname();
  const isHome = pathname === "/login" || pathname === "/register";
  const { data: userData } = useMe();

  const onSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      document.cookie = "token=; path=/; max-age=0";
      window.location.href = "/login";
    }
  }

  const menu = [
    {
      name: "Chat",
      path: "/chat",
      icon: MessageCircle,
    },
    {
      name: "Add Friend",
      path: "/add-friend",
      icon: UserPlus,
    },
    {
      name: "Friends",
      path: "/friends",
      icon: UserCheck,
    },
    {
      name: "Friend Requests",
      path: "/friendrequests",
      icon: Inbox,
    },
  ];

  return (
    isHome ? <></> :
      <aside className="max-w-64 w-full bg-white dark:bg-black border-r flex flex-col justify-between">
        {/* Top Menu */}
        <div className="p-4 space-y-1">
          <h1 className="text-xl font-bold mb-4 text-black dark:text-white">Convoia</h1>

          {menu.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition
                ${active
                    ? "bg-blue-600 text-white dark:text-white"
                    : "text-black dark:text-white hover:bg-gray-100 hover:text-black"
                  }
              `}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </div>
        <ThemeToggle />

        {/* Bottom Profile */}
        <div className="border-t p-4 flex items-center gap-3">
          <img
            src={userData?.avatar || "/profile.webp"}
            alt="profile"
            className="h-10 w-10 rounded-full"
          />
          <Link href="/viewprofile" className="w-full">
            <p className="text-sm font-medium">{userData?.name || "Loading..."}</p>
            <p className="text-xs text-gray-500">View profile</p>
          </Link>
          <button onClick={onSignOut} className="cursor-pointer">
            <LogOut />
          </button>
        </div>
      </aside>
  );
}
