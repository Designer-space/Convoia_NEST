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
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold text-foreground sm:text-2xl">Add a friend</h1>
        <p className="mt-1 text-[13px] text-t-muted">
          Send a request and you can start talking as soon as they accept.
        </p>
      </header>

      {isPending ? (
        <div className="overflow-hidden rounded-xl border border-t-border bg-t-surface">
          <Skeleton />
        </div>
      ) : users.length ? (
        <ul className="divide-y divide-t-border overflow-hidden rounded-xl border border-t-border bg-t-surface">
          {users.map((user) => (
            <li key={user.id}>
              <UserProfile
                name={user.name}
                username={user.username}
                avatar={user.avatar}
                actions={[
                  {
                    label: sending ? 'Sending…' : 'Send request',
                    onClick: () => sendRequest(user.id),
                    disabled: sending,
                  },
                ]}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-t-border bg-t-surface p-8 text-center">
          <p className="font-display text-2xl text-foreground">Nobody new right now</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-t-muted">
            You have already reached everyone here. Check back after more people join.
          </p>
        </div>
      )}
    </div>
  );
}
