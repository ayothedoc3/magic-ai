import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;

  const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isWebhookRoute = nextUrl.pathname.startsWith("/api/webhooks");

  if (isApiAuthRoute || isWebhookRoute) {
    return NextResponse.next();
  }

  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (!isPublicRoute && !isAuthenticated) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
