"use client"

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="w-full">
          <h1 className="text-5xl font-bold text-black dark:text-white mb-8">Welcome to Convoia</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Let's strike up a conversation!
          </p>
          <Link href="/chat" className="text-blue-600 hover:underline ml-2">
            Go to Chat
          </Link>
        </div>
      </main>
    </div>
  );
}