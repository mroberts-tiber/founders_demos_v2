/**
 * Proxy (formerly called "middleware") runs before a request reaches any page,
 * much like a servlet Filter mapped to a URL pattern. Here it guards /admin.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/auth";

export function proxy(request: NextRequest) {
  if (isAuthorized(request.headers.get("authorization"))) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
