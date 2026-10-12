import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex w-full max-w-3xl flex-col items-center justify-between bg-t-surface px-16 py-32 sm:items-start">
        <div className="w-full">
          <h1 className="mb-8 text-5xl font-bold text-foreground">Welcome to Convoia</h1>
          <p className="text-lg text-t-muted">Let&apos;s strike up a conversation!</p>
          <Link href="/chat" className="ml-2 text-t-primary hover:underline">
            Go to Chat
          </Link>
        </div>
      </main>
    </div>
  );
}
