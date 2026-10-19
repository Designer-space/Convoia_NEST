import Link from "next/link";
import Wordmark from "./components/Wordmark";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-5 py-14 sm:px-6">
      <div className="rise-in">
        <Wordmark size="lg" />
        <h1 className="font-display mt-7 max-w-[16ch] text-[42px] text-foreground sm:text-[58px]">
          Talk to the people you actually talk to.
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-7 text-t-muted">
          Direct messages and group threads, all in one place. Open a chat and carry on
          where you left off.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/chat"
          className="inline-flex min-h-11 items-center rounded-lg bg-t-primary px-5 text-sm font-semibold text-t-on-primary transition-opacity hover:opacity-90"
        >
          Open your chats
        </Link>
        <Link
          href="/friends"
          className="inline-flex min-h-11 items-center rounded-lg border border-t-border-strong px-5 text-sm font-medium text-foreground transition-colors hover:bg-t-hover"
        >
          See your friends
        </Link>
      </div>

      <p className="mt-10 text-[13px] text-t-muted">
        Four themes, four moods — switch any time from the header.
      </p>
    </div>
  );
}
