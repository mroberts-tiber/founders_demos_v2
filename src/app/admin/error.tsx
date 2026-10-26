"use client";

// Error boundary for admin pages: shown instead of the page if rendering or a
// Server Action throws. (Error boundaries must be Client Components.)
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card border-red-200">
      <h1 className="text-lg font-semibold text-red-800">Something went wrong</h1>
      <p className="mt-1 text-sm text-gray-600">{error.message}</p>
      <button onClick={reset} className="btn-secondary mt-4">
        Try again
      </button>
    </div>
  );
}
