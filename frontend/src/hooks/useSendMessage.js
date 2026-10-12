"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export function useSendMessage(conversationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, clientMsgId }) => {
      const data = await apiRequest({
        url: `/conversations/${conversationId}/messages`,
        method: "POST",
        data: { content, clientMsgId },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
