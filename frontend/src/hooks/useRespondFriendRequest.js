import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, action }) => {
      const endpoint =
        action === "ACCEPTED"
          ? `/friends/accept/${requestId}`
          : `/friends/reject/${requestId}`;

      return api.post(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}
