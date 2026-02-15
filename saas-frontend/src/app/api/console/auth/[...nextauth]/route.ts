// app/api/console/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import MicrosoftEntra from "next-auth/providers/microsoft-entra-id";

const isProd = process.env.NODE_ENV === "production";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`[console auth] Missing env ${name}`);
  return v;
}

// Lazy-init: NextAuth config references runtime env vars that aren't
// available during Docker build. Defer to first request.
let _handlers: ReturnType<typeof NextAuth>["handlers"] | null = null;
function getHandlers() {
  if (!_handlers) {
    const result = NextAuth({
      trustHost: true,
      basePath: "/api/console/auth",
      session: { strategy: "jwt" },
      providers: [
        MicrosoftEntra({
          clientId: requireEnv("CONSOLE_AZURE_AD_CLIENT_ID"),
          clientSecret: requireEnv("CONSOLE_AZURE_AD_CLIENT_SECRET"),
          issuer: `https://login.microsoftonline.com/${requireEnv("CONSOLE_AZURE_AD_TENANT_ID")}/v2.0`,
          authorization: {
            params: { domain_hint: "spirigroup.com"}
          }
        }),
      ],
      secret: requireEnv("CONSOLE_NEXTAUTH_SECRET"),
      cookies: {
        sessionToken: {
          name: isProd ? "__Secure-console.session-token" : "console.session-token",
          options: {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: isProd,
          },
        }
      }
    });
    _handlers = result.handlers;
  }
  return _handlers;
}

export async function GET(...args: any[]) {
  return getHandlers().GET(...args);
}
export async function POST(...args: any[]) {
  return getHandlers().POST(...args);
}
