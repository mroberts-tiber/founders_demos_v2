/**
 * Placeholder shown while a page's database queries run. Each route folder has
 * a one-line loading.tsx that re-exports one of these. Next.js wraps the page
 * in <Suspense fallback={<Loading />}>, so clicking a link swaps in this
 * placeholder immediately and the real page streams in when its data is ready.
 */
export function PageLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-sm text-gray-400">
      <span className="mr-2 size-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
      Loading…
    </div>
  );
}

/** Variant for admin pages: sits inside the admin layout, so the sidebar stays visible. */
export function AdminPageLoading() {
  return <p className="py-12 text-sm text-gray-400">Loading…</p>;
}
