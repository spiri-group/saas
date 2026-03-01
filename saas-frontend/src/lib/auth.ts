import NextAuth, { DefaultSession, NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { user_type, vendor_type } from "@/utils/spiriverse";
import { gql } from "./services/gql";
import { randomUUID } from "crypto";
import azure_identity from "./services/azure_identity";
import { AzureNamedKeyCredential, TableClient } from "@azure/data-tables";
import { TableStorageAdapter } from "@auth/azure-tables-adapter";
import { DateTime } from "luxon";
import { decode, encode } from "next-auth/jwt";
import { isNullOrUndefined } from "./functions";
import { verifyOTP } from "./services/otp";

declare module "next-auth" {
    /**
     * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        sessionToken: string;
        user: {
            id: string;
            email: string;
            currency?: string;
            locale?: string;
            requiresInput: boolean;
            vendors: vendor_type[];
            cases?: {
                id: string;
                code: string;
                location: {
                    formattedAddress: string;
                };
            }[];
            /**
             * By default, TypeScript merges new interface properties and overwrites existing ones.
             * In this case, the default session user properties will be overwritten,
             * with the new ones defined above. To keep the default session user properties,
             * you need to add them back into the newly declared interface.
             */
        } & DefaultSession["user"];
    }
}

const initializeDBAdapter = () => {
    const { env_name, env_index } = azure_identity();
    const storagename = `stspvapp${env_name}${env_index}`;

    const credential = new AzureNamedKeyCredential(storagename, process.env.AUTH_AZURE_ACCESS_KEY as string);
    const authClient = new TableClient(`https://${storagename}.table.core.windows.net`, "auth", credential);

    return TableStorageAdapter(authClient);
};

const dbAdapter = initializeDBAdapter();

export const authOptions: NextAuthConfig = {
    trustHost: true,
    pages: {
        signIn: '/', // Don't redirect to error page on failed sign in
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production"
            ? "__Secure-app.session-token"
            : "app.session-token",
            options: {
            path: "/",                   // app-wide
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            },
        },
    },
    providers: [
        Credentials({
            credentials: {
                email: {},
                otp: {},
            },
            authorize: async (credentials) => {
                if (isNullOrUndefined(credentials)) {
                    return null;
                }

                const otp_entered = credentials["otp"] as string | undefined;
                const email = credentials["email"] as string | undefined;

                if (otp_entered == null || email == null) {
                    throw new Error("Missing credentials");
                }

                // Demo accounts bypass OTP verification
                const DEMO_EMAILS = [
                    "awaken@spirigroup.com",
                    "illuminate@spirigroup.com",
                    "manifest@spirigroup.com",
                    "transcend@spirigroup.com",
                ];
                const isDemoAccount = DEMO_EMAILS.includes(email.toLowerCase());

                if (!isDemoAccount) {
                    const isValid = await verifyOTP({ email, otp: otp_entered });
                    if (!isValid) {
                        return null;
                    }
                }

                let user = await dbAdapter.getUserByEmail!(email.toString());
                if (user == null) {
                    await dbAdapter.createUser!({
                        id: randomUUID(),
                        email: email.toString(),
                        emailVerified: DateTime.now().toJSDate(),
                    });
                }
                user = await dbAdapter.getUserByEmail!(email.toString());

                return user;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            if (account?.provider === "credentials") {
                const sessionToken = randomUUID();
                const expires = new Date(Date.now() + 60 * 60 * 24 * 30 * 1000);

                const session = await dbAdapter.createSession!({
                    userId: user.id!,
                    sessionToken,
                    expires,
                });

                token.sessionId = session.sessionToken;

                const gql_conn = {
                    auth: `Bearer ${Buffer.from(
                        JSON.stringify({
                            token: session.sessionToken,
                        })
                    ).toString("base64")}`,
                };

                await gql<any>(
                    `
                    mutation create_user {
                        create_user
                    }
                `,
                    {},
                    gql_conn.auth
                );
            }

            return token;
        },
        async session({ session, token }) {
            const sessionId = token.sessionId;

            const auth = `Bearer ${Buffer.from(
                JSON.stringify({
                    token: sessionId,
                })
            ).toString("base64")}`;

            const { me } = await gql<{ me: user_type | null }>(
                `query get_me {
                    me {
                        id
                        email
                        currency
                        locale
                        requiresInput
                        vendors {
                            id
                            name
                            slug
                            currency
                            docType
                        }
                        cases {
                            id
                            code
                            location {
                                formattedAddress
                            }
                        }
                    }
                }`,
                {},
                auth
            );

            // Handle case where user exists in auth table but not in Cosmos (e.g., transient error, cleanup)
            // Default requiresInput to false — a transient failure should not lock users out to /setup
            if (!me) {
                console.warn('[auth] Session references non-existent user, returning minimal session');
                return {
                    ...session,
                    sessionToken: sessionId,
                    user: {
                        id: '',
                        email: session.user?.email || '',
                        vendors: [],
                        requiresInput: false,
                        currency: undefined,
                        locale: undefined,
                        cases: [],
                    },
                };
            }

            return {
                ...session,
                sessionToken: sessionId,
                user: {
                    id: me.id,
                    email: me.email,
                    vendors: me.vendors,
                    requiresInput: me.requiresInput,
                    currency: me.currency,
                    locale: me.locale,
                    cases: me.cases,
                },
            };
        },
    },
    jwt: {
        maxAge: 60 * 60 * 24 * 30,
        async encode(arg) {
            if (arg.token?.sessionId) {
                return await encode({
                    token: { sessionId: arg.token.sessionId },
                    salt: arg.salt,
                    secret: process.env.AUTH_SECRET as string,
                });
            } else {
                return await encode(arg);
            }
        },
        async decode(arg: any) {
            try {
                const token = await decode({
                    token: arg.token,
                    secret: process.env.AUTH_SECRET as string,
                    salt: arg.salt,
                });
                return token;
            } catch (error) {
                console.error("Error decoding token:", error);
                return null;
            }
        },
    },
    debug: process.env.NODE_ENV === "development",
    events: {
        async signOut(message) {
            if ("session" in message && message.session?.sessionToken) {
                await dbAdapter.deleteSession!(message.session.sessionToken);
            }
        },
    },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
