'use client'

import { useUnfriend } from '@/hooks/useUnfriend';
import { apiRequest } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { UserProfile } from '../components/UserProfile';
import { useRouter } from 'next/navigation';

const page = () => {
  const router = useRouter();
  const { mutate: unfriend, isPending: unfriending } = useUnfriend();

  const { data, isPending, isError } = useQuery({
    queryKey: ["friends"],
    queryFn: () =>
      apiRequest({ url: "/friends/myfriends", method: "GET" }),
  });

  if (isPending) {
    return <p className="text-center">Loading friends...</p>;
  }

  if (isError) {
    return <p className="text-center text-red-500">Failed to load friends</p>;
  }

  const friends = data?.friends ?? [];

  const getActions = (friend) => [
    {
      label: "Send Message",
      onClick: () => router.push(`/chat/${friend.id}`),
    },
    {
      label: unfriending ? "Unfriending..." : "Unfriend",
      variant: "danger",
      onClick: () => unfriend(friend.id),
      disabled: unfriending,
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="w-full">
          <h1 className="text-2xl font-bold mb-4">Your Friends</h1>
          <div className="space-y-8">
            {!friends.length ? (
              <p className="text-gray-500">You don’t have any friends yet</p>
            ) : (
              friends.map(({ friend }) => (
                <UserProfile
                  key={friend.id}
                  name={friend.name}
                  avatar={friend.avatar}
                  actions={getActions(friend)}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default page