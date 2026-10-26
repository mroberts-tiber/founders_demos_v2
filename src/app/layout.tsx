import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "Find out how ready your company is to be acquired, and what to improve first.",
};

// The root layout wraps every page, like a JSP include of header.jsp/footer.jsp
// around each page. It renders once and stays mounted as the user navigates.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-brand">
              <span className="grid size-7 place-items-center rounded bg-brand text-xs text-white">AR</span>
              {SITE_NAME}
            </Link>
            <nav className="flex items-center gap-5 text-sm text-gray-600">
              <Link href="/assess" className="hover:text-brand">
                Take the assessment
              </Link>
              <Link href="/admin" className="hover:text-brand">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
          {SITE_NAME} demo
        </footer>
      </body>
    </html>
  );
}
