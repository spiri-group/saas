// app/api/console/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import MicrosoftEntra from "next-auth/providers/microsoft-entra-id";
import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

// Console auth env vars are only available in full deployments (not PR previews).
// When missing, the route returns a 503 instead of crashing the build.
const consoleEnvAvailable =
  !!process.env.CONSOLE_AZURE_AD_CLIENT_ID &&
  !!process.env.CONSOLE_AZURE_AD_CLIENT_SECRET &&
  !!process.env.CONSOLE_AZURE_AD_TENANT_ID &&
  !!process.env.CONSOLE_NEXTAUTH_SECRET;

const unavailableResponse = () =>
  NextResponse.json({ error: "Console auth not configured" }, { status: 503 });

const { handlers } = consoleEnvAvailable
  ? NextAuth({
      trustHost: true,
      basePath: "/api/console/auth",
      session: { strategy: "jwt" },
      providers: [
        MicrosoftEntra({
          clientId: process.env.CONSOLE_AZURE_AD_CLIENT_ID!,
          clientSecret: process.env.CONSOLE_AZURE_AD_CLIENT_SECRET!,
          issuer: `https://login.microsoftonline.com/${process.env.CONSOLE_AZURE_AD_TENANT_ID}/v2.0`,
          authorization: {
            params: { domain_hint: "spirigroup.com" },
          },
        }),
      ],
      secret: process.env.CONSOLE_NEXTAUTH_SECRET,
      cookies: {
        sessionToken: {
          name: isProd
            ? "__Secure-console.session-token"
            : "console.session-token",
          options: {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: isProd,
          },
        },
      },
    })
  : { handlers: { GET: unavailableResponse, POST: unavailableResponse } };

export const { GET, POST } = handlers
