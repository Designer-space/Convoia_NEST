import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receiverId) => {
      return api.post(`/friends/request/${receiverId}`);
    },
    onSuccess: () => {
      // Refetch users list so the UI reflects latest state from backend
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });
}
