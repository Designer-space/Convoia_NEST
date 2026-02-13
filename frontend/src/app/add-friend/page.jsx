'use client'

import { useSendFriendRequest } from '@/hooks/useSendFriendRequest';
import { apiRequest } from '@/lib/api';
import { UserProfile } from '../components/UserProfile';
import Skeleton from '../components/Skeleton';
import { useQuery } from '@tanstack/react-query';

const page = () => {

    const { mutate: sendRequest, isPending } = useSendFriendRequest();

  const { data, isPending: isPendingNonFriend } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () =>
      apiRequest({ url: "/friends/nonfriends", method: "GET" }),
  });

  const getActions = (user) => [
    {
      label: isPendingNonFriend ? "Sending..." : "Send Request",
      onClick: () => sendRequest(user.id),
      disabled: isPendingNonFriend,
    },
  ];

  return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
          <main className="flex w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
              <div className="w-full">
                    <h1 className="text-2xl font-bold mb-4">Lets connect with new peoples</h1>
                    <div className="w-full space-y-8">
                        {
                            (isPendingNonFriend || isPending) ? <Skeleton /> :
                                (data?.users &&
                                    data?.users.map((user) => (
                                        <UserProfile
                                            key={user.id}
                                            id={user.id}
                                            name={user.name}
                                            avatar={user.avatar}
                                            actions={getActions(user)}
                                        />
                                    ))
                                )
                        }
                    </div>
              </div>
          </main>
      </div>
  )
}

export default page