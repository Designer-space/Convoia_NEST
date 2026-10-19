/**
 * Loading placeholder shaped like the rows it replaces (people lists, request
 * lists): theme tokens, so it reads correctly in all four themes, and it stops
 * pulsing when the visitor prefers reduced motion.
 */
export default function Skeleton({ rows = 4 }) {
  return (
    <div className="divide-y divide-t-border" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-t-hover motion-reduce:animate-none" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-t-hover motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-t-hover motion-reduce:animate-none" />
          </div>
          <div className="h-9 w-24 shrink-0 animate-pulse rounded-lg bg-t-hover motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
