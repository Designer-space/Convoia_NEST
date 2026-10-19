'use client';

import { useQuery } from '@tanstack/react-query';
import { useRespondFriendRequest } from '@/hooks/useRespondFriendRequest';
import { apiRequest } from '@/lib/api';
import Skeleton from '../components/Skeleton';
import { UserProfile } from '../components/UserProfile';

export default function FriendRequestsPage() {
  const { mutate: respondRequest, isPending: responding } = useRespondFriendRequest();

  const { data, isPending, isError } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: () => apiRequest({ url: '/friends/requests', method: 'GET' }),
  });

  const requests = data?.requests ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold text-foreground sm:text-2xl">Friend requests</h1>
        <p className="mt-1 text-[13px] text-t-muted">
          {requests.length
            ? `${requests.length} ${requests.length === 1 ? 'person is' : 'people are'} waiting to hear back.`
            : 'Accepting adds someone to your friends and you can start chatting.'}
        </p>
      </header>

      {isPending ? (
        <div className="overflow-hidden rounded-xl border border-t-border bg-t-surface">
          <Skeleton />
        </div>
      ) : isError ? (
        <p className="text-sm text-t-danger">
          We couldn&apos;t load your requests. Reload the page to try again.
        </p>
      ) : requests.length ? (
        <ul className="divide-y divide-t-border overflow-hidden rounded-xl border border-t-border bg-t-surface">
          {requests.map((req) => (
            <li key={req.id}>
              <UserProfile
                name={req.sender.name}
                username={req.sender.username}
                avatar={req.sender.avatar}
                actions={[
                  {
                    label: responding ? 'Accepting…' : 'Accept',
                    onClick: () => respondRequest({ requestId: req.id, action: 'ACCEPTED' }),
                    disabled: responding,
                  },
                  {
                    label: 'Reject',
                    variant: 'quiet',
                    onClick: () => respondRequest({ requestId: req.id, action: 'REJECTED' }),
                    disabled: responding,
                  },
                ]}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-t-border bg-t-surface p-8 text-center">
          <p className="font-display text-2xl text-foreground">Nothing waiting on you</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-t-muted">
            New requests land here. You can also go and send one of your own.
          </p>
        </div>
      )}
    </div>
  );
}
