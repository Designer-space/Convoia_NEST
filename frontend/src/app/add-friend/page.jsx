'use client';

import { useQuery } from '@tanstack/react-query';
import { useSendFriendRequest } from '@/hooks/useSendFriendRequest';
import { apiRequest } from '@/lib/api';
import { UserProfile } from '../components/UserProfile';
import Skeleton from '../components/Skeleton';

export default function AddFriendPage() {
  const { mutate: sendRequest, isPending: sending } = useSendFriendRequest();

  const { data, isPending } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => apiRequest({ url: '/friends/nonfriends', method: 'GET' }),
  });

  const users = data?.users ?? [];

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Let&apos;s connect with new people
      </h1>
      <div className="space-y-6">
        {isPending ? (
          <Skeleton />
        ) : users.length ? (
          users.map((user) => (
            <UserProfile
              key={user.id}
              id={user.id}
              name={user.name}
              avatar={user.avatar}
              actions={[
                {
                  label: sending ? 'Sending…' : 'Send Request',
                  onClick: () => sendRequest(user.id),
                  disabled: sending,
                },
              ]}
            />
          ))
        ) : (
          <p className="text-t-muted">No new people to connect with right now.</p>
        )}
      </div>
    </div>
  );
}
