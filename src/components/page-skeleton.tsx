/**
 * Placeholder shown while a route's server component is being rendered.
 *
 * Without it the router keeps the previous page on screen until the new one is
 * ready, so a click looks frozen. Each loading.tsx is a separate boundary that
 * the router can use as soon as a link is prefetched.
 */
export default function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Laddar sidan…</span>

      <div className="animate-pulse space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5" />
          <div className="space-y-2">
            <div className="h-6 w-44 rounded-lg bg-white/10" />
            <div className="h-3 w-64 rounded bg-white/5" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.07] bg-slate-900/50 p-5 backdrop-blur-xl"
            >
              <div className="h-3 w-24 rounded bg-white/5" />
              <div className="mt-4 h-8 w-16 rounded-lg bg-white/10" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-2xl border border-white/[0.07] bg-slate-900/50 p-6 backdrop-blur-xl"
            >
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-5/6 rounded bg-white/5" />
              <div className="h-3 w-2/3 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
