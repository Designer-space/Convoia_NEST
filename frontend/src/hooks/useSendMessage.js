"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export function useSendMessage(conversationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content) => {
      const data = await apiRequest({
        url: `/conversations/${conversationId}/messages`,
        method: "POST",
        data: { content },
      });
      return data;
    },
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
