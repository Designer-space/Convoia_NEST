"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getSocket } from "@/lib/socket";
import { useAccessToken } from "@/hooks/useAccessToken";

export default function useNotifications() {
  const token = useAccessToken();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNotification = (data) => {
      switch (data?.type) {
        case "FRIEND_REQUEST_SENT":
          toast.info(`👋 ${data.payload?.senderName ?? "Someone"} sent you a friend request`);
          break;
        case "FRIEND_REQUEST_ACCEPTED":
          toast.success(
            `🎉 ${data.payload?.receiverName ?? "Someone"} accepted your friend request`,
          );
          break;
        case "FRIEND_REQUEST_REJECTED":
          toast.error(
            `❌ ${data.payload?.receiverName ?? "Someone"} rejected your friend request`,
          );
          break;
        default:
          break;
      }

      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    };

    // Re-sync after a reconnect (room membership is rebuilt server-side).
    const handleReconnect = () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.off("notification", handleNotification);
    socket.on("notification", handleNotification);
    socket.io.off("reconnect", handleReconnect);
    socket.io.on("reconnect", handleReconnect);

    return () => {
      socket.off("notification", handleNotification);
      socket.io.off("reconnect", handleReconnect);
    };
  }, [token, queryClient]);
}
