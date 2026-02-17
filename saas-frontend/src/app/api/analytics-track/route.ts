const analyticsUri =
    process.env.NEXT_PUBLIC_server_endpoint != undefined &&
    !process.env.NEXT_PUBLIC_server_endpoint.includes('localhost')
        ? `${process.env.NEXT_PUBLIC_server_endpoint}/analytics-track?code=${process.env.NEXT_PUBLIC_server_endpoint_code}`
        : "http://127.0.0.1:7071/api/analytics-track";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const response = await fetch(analyticsUri, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': request.headers.get('user-agent') || '',
                'Accept-Language': request.headers.get('accept-language') || '',
            },
            body: JSON.stringify(body),
        });

        return new Response(null, { status: response.status });
    } catch {
        // Fail silently — don't break user experience
        return new Response(null, { status: 204 });
    }
}
