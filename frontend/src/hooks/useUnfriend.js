import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export const useUnfriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendId) =>
      apiRequest({
        url: `/friends/${friendId}`,
        method: "DELETE",
      }),

    onMutate: async (friendId) => {
      await queryClient.cancelQueries({ queryKey: ["friends"] });

      const previousFriends = queryClient.getQueryData(["friends"]);

      queryClient.setQueryData(["friends"], (old) => {
        if (!old?.friends) return old;
        return {
          ...old,
          friends: old.friends.filter((f) => f.friend.id !== friendId),
          count: Math.max(0, (old.count ?? 0) - 1),
        };
      });

      return { previousFriends };
    },

    onError: (_err, _friendId, context) => {
      queryClient.setQueryData(["friends"], context?.previousFriends);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["nonFriends"] });
    },
  });
};
