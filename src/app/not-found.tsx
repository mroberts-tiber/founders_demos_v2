import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-brand">Page not found</h1>
      <p className="mt-2 text-gray-600">That link may be out of date.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </main>
  );
}
