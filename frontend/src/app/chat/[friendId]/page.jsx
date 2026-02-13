"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function ChatWithFriendPage() {
  const params = useParams();
  const router = useRouter();
  const friendId = params.friendId ? parseInt(params.friendId, 10) : null;
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!friendId || Number.isNaN(friendId)) {
      router.replace("/chat");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await apiRequest({
          url: "/conversations",
          method: "POST",
          data: { type: "DM", participantIds: [friendId] },
        });
        if (!cancelled && data?.conversation?.id != null) {
          router.replace(`/chat?c=${data.conversation.id}`);
          return;
        }
        if (!cancelled) router.replace("/chat");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setTimeout(() => router.replace("/chat"), 2000);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [friendId, router]);

  if (status === "error") {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-red-500">Could not start conversation. Redirecting to chat...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <p className="text-zinc-500">Opening conversation...</p>
    </div>
  );
}
