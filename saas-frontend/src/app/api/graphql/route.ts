import { auth } from '@/lib/auth';
import { isNullOrWhitespace } from '@/lib/functions';
import { Session } from 'next-auth';

const gql_uri =
    process.env.server_endpoint != undefined &&
    !process.env.server_endpoint.includes('localhost')
        ? `${process.env.server_endpoint}/graphql?code=${process.env.server_endpoint_code}`
        : "http://127.0.0.1:7071/api/graphql"

export async function POST(request: Request) {
    const { query, variables } = await request.json();

    let session: Session | null = null;
    try {
        session = await auth();
    } catch {
        // Session might not exist yet during initial login - that's OK, we'll use the Authorization header
    }

    const gql_auth = session != null && session.user != null ? Buffer.from(JSON.stringify({
        token: session.sessionToken,
        email: session.user.email
    })).toString('base64') : null

    try {
        const headers = {
            'Content-Type': 'application/json'
        } as Record<string, string>;

        if (request.headers.has("Authorization") && !isNullOrWhitespace(request.headers.get("Authorization"))) {
            headers['Authorization'] = request.headers.get("Authorization") as string;
        } else if (gql_auth != null) {
            headers['Authorization'] = `Bearer ${gql_auth}`;
        }

        const response = await fetch(gql_uri, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, variables }),
            cache: 'no-cache'
        });

        const data = await response.json();

        return Response.json(data, { status: response.status });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
