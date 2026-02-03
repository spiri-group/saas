import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import axios from "axios";

/**
 * Azure Function to proxy video requests with CORS headers
 * This avoids CORS issues by serving video through our backend
 */
export async function proxy_video(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`Video proxy request for url "${request.url}"`);

    try {
        // Get video URL from query params
        const videoUrl = request.query.get('url');

        if (!videoUrl) {
            return {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                },
                jsonBody: {
                    error: 'url parameter is required'
                }
            };
        }

        context.log(`Proxying video from: ${videoUrl}`);

        // Support range requests for video seeking
        const range = request.headers.get('range');
        const headers: any = {};
        if (range) {
            headers['Range'] = range;
        }

        // Fetch the video from blob storage
        const response = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            headers,
            timeout: 60000,
            validateStatus: (status) => status < 500 // Accept 206 Partial Content
        });

        // Return video with CORS headers
        return {
            status: response.status,
            headers: {
                'Content-Type': response.headers['content-type'] || 'video/mp4',
                'Content-Length': response.headers['content-length'],
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Expose-Headers': '*',
                ...(response.headers['content-range'] && {
                    'Content-Range': response.headers['content-range']
                }),
                'Cache-Control': 'public, max-age=3600'
            },
            body: Buffer.from(response.data)
        };

    } catch (error: any) {
        context.error('Error proxying video:', error);
        return {
            status: error.response?.status || 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                error: 'Failed to proxy video',
                message: error.message
            }
        };
    }
}

// Handle OPTIONS preflight requests
async function handleOptions(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    return {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '3600'
        }
    };
}

app.http("proxy_video", {
    methods: ["GET", "HEAD", "OPTIONS"],
    authLevel: "anonymous",
    handler: async (request, context) => {
        if (request.method === "OPTIONS") {
            return handleOptions(request, context);
        }
        return proxy_video(request, context);
    }
});
