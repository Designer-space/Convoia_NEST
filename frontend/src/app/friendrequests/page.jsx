"use client";
import { useRespondFriendRequest } from '@/hooks/useRespondFriendRequest';
import { useQuery } from '@tanstack/react-query';
import React from 'react'
import Skeleton from '../components/Skeleton';
import { UserProfile } from '../components/UserProfile';
import { apiRequest } from '@/lib/api';

const page = () => {
  const { mutate: respondRequest, isPending: responding } =
    useRespondFriendRequest();

  const { data, isPending, isError } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: async () =>
      await apiRequest({ url: "/friends/requests", method: "GET" }),
  });

  // if (isPending) return <Skeleton />;
  if (isError) return <p>Something went wrong</p>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="w-full space-y-8">
          <h1 className="text-2xl font-bold mb-4">Friend Requests</h1>

          {data?.requests?.length === 0 && (
            <p className="text-gray-500">No pending friend requests</p>
          )}

          {
            isPending ? (<Skeleton />) : (
              data?.requests?.map((req) => (
                <UserProfile
                  key={req.id}
                  name={req.sender.name}
                  avatar={req.sender.avatar}
                  actions={[
                    {
                      label: responding ? "Accepting..." : "Accept",
                      onClick: () =>
                        respondRequest({
                          requestId: req.id,
                          action: "ACCEPTED",
                        }),
                      disabled: responding,
                    },
                    {
                      label: "Reject",
                      variant: "danger",
                      onClick: () =>
                        respondRequest({
                          requestId: req.id,
                          action: "REJECTED",
                        }),
                      disabled: responding,
                    },
                  ]}
                />
              )))
          }
        </div>
      </main>
    </div>
  )
}

export default page