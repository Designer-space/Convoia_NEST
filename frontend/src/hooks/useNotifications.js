"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/useMe";
import { toast } from "react-toastify";

export default function useNotifications() {
  const { data: user } = useMe();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNotification = (data) => {
      console.log("🔔 New notification:", data);

      // 🔔 Toast handling (UX only)
      switch (data.type) {
        case "FRIEND_REQUEST_SENT":
          toast.info(
            `👋 ${data.payload.senderName ?? "Someone"} sent you a friend request`
          );
          break;

        case "FRIEND_REQUEST_ACCEPTED":
          toast.success(
            `🎉 ${data.payload.receiverName ?? "Someone"} accepted your friend request`
          );
          break;

        case "FRIEND_REQUEST_REJECTED":
          toast.error(
            `❌ ${data.payload.receiverName ?? "Someone"} rejected your friend request`
          );
          break;

        default:
          console.warn("Unhandled notification type:", data.type);
      }

      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      // queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.off("notification");
    socket.on("notification", handleNotification);

    socket.on("error", (error) => {
      console.error("Socket connection error:", error);
    });

    return () => {
      socket.off("notification", handleNotification);
      socket.off("error");
    };
  }, [user?.id, queryClient]);
}
