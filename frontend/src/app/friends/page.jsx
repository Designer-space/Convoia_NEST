'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUnfriend } from '@/hooks/useUnfriend';
import { apiRequest } from '@/lib/api';
import { UserProfile } from '../components/UserProfile';

function sinceLabel(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `Friends since ${date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

export default function FriendsPage() {
  const router = useRouter();
  const { mutate: unfriend, isPending: unfriending } = useUnfriend();

  const { data, isPending, isError } = useQuery({
    queryKey: ['friends'],
    queryFn: () => apiRequest({ url: '/friends/myfriends', method: 'GET' }),
  });

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-[22px] font-semibold text-foreground sm:text-2xl">Friends</h1>
        <p className="mt-6 text-sm text-t-muted">Loading your friends…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-[22px] font-semibold text-foreground sm:text-2xl">Friends</h1>
        <p className="mt-6 text-sm text-t-danger">
          We couldn&apos;t load your friends. Reload the page to try again.
        </p>
      </div>
    );
  }

  const friends = data?.friends ?? [];

  const getActions = (friend) => [
    {
      label: 'Send message',
      variant: 'primary',
      onClick: () => router.push(`/chat/${friend.id}`),
    },
    {
      label: unfriending ? 'Removing…' : 'Unfriend',
      variant: 'danger',
      onClick: () => unfriend(friend.id),
      disabled: unfriending,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold text-foreground sm:text-2xl">Friends</h1>
        <p className="mt-1 text-[13px] text-t-muted">
          {friends.length
            ? `${friends.length} ${friends.length === 1 ? 'person' : 'people'} you can message right now.`
            : 'People you add show up here, ready to message.'}
        </p>
      </header>

      {!friends.length ? (
        <div className="rounded-xl border border-t-border bg-t-surface p-8 text-center">
          <p className="font-display text-2xl text-foreground">No one here yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-t-muted">
            Send a friend request and your conversations can start from this list.
          </p>
          <Link
            href="/add-friend"
            className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-t-primary px-4 text-sm font-medium text-t-on-primary transition-opacity hover:opacity-90"
          >
            Find people to add
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-t-border overflow-hidden rounded-xl border border-t-border bg-t-surface">
          {friends.map(({ friend, friendsSince }) => (
            <li key={friend.id}>
              <UserProfile
                name={friend.name}
                username={friend.username}
                avatar={friend.avatar}
                meta={sinceLabel(friendsSince)}
                actions={getActions(friend)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
