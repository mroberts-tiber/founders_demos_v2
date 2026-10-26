import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" } };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/industries", label: "Industries" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/tags", label: "Tags" },
];

// Nested layout: wraps every /admin/* page inside the root layout.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8">
      <aside className="w-44 shrink-0">
        <p className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">Admin</p>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-gray-700 hover:bg-white hover:text-brand">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
