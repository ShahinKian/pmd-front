import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cookies";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/fa" || pathname === "/en") {
    return NextResponse.redirect(new URL("/" + search, request.url));
  }
  if (pathname.startsWith("/fa/") || pathname.startsWith("/en/")) {
    const pathWithoutLocale = pathname.replace(/^\/(fa|en)/, "") || "/";
    return NextResponse.redirect(new URL(pathWithoutLocale + search, request.url));
  }

  const hasSession =
    Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value) ||
    Boolean(request.cookies.get(REFRESH_TOKEN_COOKIE)?.value);

  if (pathname === "/login") {
    if (hasSession) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("returnTo", pathname + search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
