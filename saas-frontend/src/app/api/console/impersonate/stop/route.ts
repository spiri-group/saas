import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

const isProd = process.env.NODE_ENV === "production";
const CONSOLE_COOKIE = isProd ? "__Secure-console.session-token" : "console.session-token";
const APP_COOKIE = isProd ? "__Secure-app.session-token" : "app.session-token";

export async function POST() {
    const cookieStore = await cookies();

    // Verify the caller is a console admin
    const consoleCookie = cookieStore.get(CONSOLE_COOKIE);
    if (!consoleCookie?.value) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const token = await decode({
            token: consoleCookie.value,
            secret: process.env.CONSOLE_NEXTAUTH_SECRET as string,
            salt: CONSOLE_COOKIE,
        });
        if (!(token?.email as string)?.endsWith("@spirigroup.com")) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
    } catch {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clear the impersonation cookies
    cookieStore.set(APP_COOKIE, "", { path: "/", maxAge: 0 });
    cookieStore.set("impersonating-user", "", { path: "/", maxAge: 0 });

    return Response.json({ success: true });
}
