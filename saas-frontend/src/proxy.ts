// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
const isProd = process.env.NODE_ENV === "production";
const CONSOLE_COOKIE_BASE = isProd ? "__Secure-console.session-token" : "console.session-token";
const AUTHJS_DEFAULT_SECURE_BASE = "__Secure-authjs.session-token";
const AUTHJS_DEFAULT_BASE = "authjs.session-token";
const CONSOLE_SECRET = process.env.CONSOLE_NEXTAUTH_SECRET!;

async function decodeWithCandidates(req: NextRequest, bases: string[], secret: string) {
  for (const base of bases) {
    const tok = await getToken({ req, secret, cookieName: base });
    if (tok) return tok;
  }
  return null;
}

const CANONICAL_HOST = 'www.spiriverse.com';

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  const host = request.headers.get('host') || '';

  // Redirect non-canonical domains to www.spiriverse.com in production
  if (
    isProd &&
    host !== CANONICAL_HOST &&
    !host.includes('localhost') &&
    !host.includes('azurecontainerapps.io')
  ) {
    const redirectUrl = url.clone();
    redirectUrl.host = CANONICAL_HOST;
    redirectUrl.protocol = 'https';
    redirectUrl.port = '';
    return NextResponse.redirect(redirectUrl, 301);
  }

  const newHeaders = new Headers(request.headers);
  const auth = request.cookies.get("Authorization");
  if (auth) newHeaders.set("Authorization", auth.value);

  if (path.startsWith("/console")) {
    const token = await decodeWithCandidates(
      request,
      [CONSOLE_COOKIE_BASE, AUTHJS_DEFAULT_SECURE_BASE, AUTHJS_DEFAULT_BASE],
      CONSOLE_SECRET
    );

    if (!token && !path.startsWith("/console/login")) {
      const next = encodeURIComponent(path + url.search);
      return NextResponse.redirect(new URL(`/console/login?callbackUrl=${next}`, url.origin));
    }

    return NextResponse.next({ request: { headers: newHeaders } });
  }

  return NextResponse.next({ request: { headers: newHeaders } });
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.ico).*)",
};