import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { decode, encode } from "next-auth/jwt";
import azure_identity from "@/lib/services/azure_identity";
import { AzureNamedKeyCredential, TableClient } from "@azure/data-tables";
import { TableStorageAdapter } from "@auth/azure-tables-adapter";

const isProd = process.env.NODE_ENV === "production";
const CONSOLE_COOKIE = isProd ? "__Secure-console.session-token" : "console.session-token";
const APP_COOKIE = isProd ? "__Secure-app.session-token" : "app.session-token";

async function verifyConsoleAdmin(): Promise<string | null> {
    const cookieStore = await cookies();
    const consoleCookie = cookieStore.get(CONSOLE_COOKIE);
    if (!consoleCookie?.value) return null;

    try {
        const token = await decode({
            token: consoleCookie.value,
            secret: process.env.CONSOLE_NEXTAUTH_SECRET as string,
            salt: CONSOLE_COOKIE,
        });
        const email = token?.email as string | undefined;
        if (!email?.endsWith("@spirigroup.com")) return null;
        return email;
    } catch {
        return null;
    }
}

function initializeDBAdapter() {
    const { env_name, env_index } = azure_identity();
    const storagename = `stspvapp${env_name}${env_index}`;
    const credential = new AzureNamedKeyCredential(storagename, process.env.AUTH_AZURE_ACCESS_KEY as string);
    const authClient = new TableClient(`https://${storagename}.table.core.windows.net`, "auth", credential);
    return TableStorageAdapter(authClient);
}

export async function POST(request: Request) {
    const adminEmail = await verifyConsoleAdmin();
    if (!adminEmail) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) {
        return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const dbAdapter = initializeDBAdapter();

    const user = await dbAdapter.getUserByEmail!(email);
    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Create a session for the target user (4 hour expiry)
    const sessionToken = randomUUID();
    const expires = new Date(Date.now() + 4 * 60 * 60 * 1000);

    await dbAdapter.createSession!({
        userId: user.id!,
        sessionToken,
        expires,
    });

    // Encode as JWT matching the app auth format
    const encodedJwt = await encode({
        token: { sessionId: sessionToken },
        salt: APP_COOKIE,
        secret: process.env.AUTH_SECRET as string,
    });

    const cookieStore = await cookies();

    // Set the app session cookie
    cookieStore.set(APP_COOKIE, encodedJwt, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        maxAge: 4 * 60 * 60,
    });

    // Set a readable cookie so the frontend can show the impersonation banner
    cookieStore.set("impersonating-user", email, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: isProd,
        maxAge: 4 * 60 * 60,
    });

    return Response.json({ success: true, email });
}
