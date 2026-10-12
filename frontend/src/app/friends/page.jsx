'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useUnfriend } from '@/hooks/useUnfriend';
import { apiRequest } from '@/lib/api';
import { UserProfile } from '../components/UserProfile';

export default function FriendsPage() {
  const router = useRouter();
  const { mutate: unfriend, isPending: unfriending } = useUnfriend();

  const { data, isPending, isError } = useQuery({
    queryKey: ['friends'],
    queryFn: () => apiRequest({ url: '/friends/myfriends', method: 'GET' }),
  });

  if (isPending) return <p className="p-8 text-center text-t-muted">Loading friends…</p>;
  if (isError) return <p className="p-8 text-center text-red-500">Failed to load friends</p>;

  const friends = data?.friends ?? [];

  const getActions = (friend) => [
    {
      label: 'Send Message',
      onClick: () => router.push(`/chat/${friend.id}`),
    },
    {
      label: unfriending ? 'Unfriending…' : 'Unfriend',
      variant: 'danger',
      onClick: () => unfriend(friend.id),
      disabled: unfriending,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Your Friends</h1>
      <div className="space-y-6">
        {!friends.length ? (
          <p className="text-t-muted">You don&apos;t have any friends yet</p>
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
  );
}
