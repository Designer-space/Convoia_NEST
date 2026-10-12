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

  if (isError) return <p className="p-8 text-center text-red-500">Something went wrong</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Friend Requests</h1>

      {isPending ? (
        <Skeleton />
      ) : data?.requests?.length ? (
        <div className="space-y-6">
          {data.requests.map((req) => (
            <UserProfile
              key={req.id}
              name={req.sender.name}
              avatar={req.sender.avatar}
              actions={[
                {
                  label: responding ? 'Accepting…' : 'Accept',
                  onClick: () =>
                    respondRequest({ requestId: req.id, action: 'ACCEPTED' }),
                  disabled: responding,
                },
                {
                  label: 'Reject',
                  variant: 'danger',
                  onClick: () =>
                    respondRequest({ requestId: req.id, action: 'REJECTED' }),
                  disabled: responding,
                },
              ]}
            />
          ))}
        </div>
      ) : (
        <p className="text-t-muted">No pending friend requests</p>
      )}
    </div>
  );
}
