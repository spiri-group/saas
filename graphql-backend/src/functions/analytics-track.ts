import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { LogManager } from "../utils/functions";
import { vault } from "../services/vault";
import { TableStorageDataSource } from "../services/tablestorage";
import NodeCache from "node-cache";

interface AnalyticsPayload {
    sessionId: string;
    url: string;
    referrer?: string;
    screenWidth?: number;
    screenHeight?: number;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    scrollDepth?: number;
    timeOnPage?: number;
    eventType: "pageview" | "pageleave";
}

const BOT_PATTERNS = [
    /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
    /headless/i, /phantom/i, /lighthouse/i, /pingdom/i, /uptimerobot/i,
    /gtmetrix/i, /pageSpeed/i, /facebookexternalhit/i, /Twitterbot/i,
];

function isBot(userAgent: string): boolean {
    return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

function parseBrowser(ua: string): string {
    if (/Edg\//i.test(ua)) return "Edge";
    if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
    if (/Firefox\//i.test(ua)) return "Firefox";
    if (/MSIE|Trident/i.test(ua)) return "IE";
    return "Other";
}

function parseOS(ua: string): string {
    if (/Windows/i.test(ua)) return "Windows";
    if (/Macintosh|Mac OS/i.test(ua)) return "macOS";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Android/i.test(ua)) return "Android";
    if (/Linux/i.test(ua)) return "Linux";
    if (/CrOS/i.test(ua)) return "ChromeOS";
    return "Other";
}

function parseDeviceType(ua: string): string {
    if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) return "Mobile";
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return "Tablet";
    return "Desktop";
}

function parseCountryFromAcceptLanguage(header: string | null): string {
    if (!header) return "Unknown";
    const match = header.match(/[a-z]{2}-([A-Z]{2})/);
    return match ? match[1] : "Unknown";
}

// Cached across invocations
const cache = new NodeCache({ stdTTL: 300 });
let tableStorage: TableStorageDataSource | null = null;

async function getTableStorage(request: HttpRequest, context: InvocationContext): Promise<TableStorageDataSource> {
    if (tableStorage) return tableStorage;

    const host = request.headers.get("host") || "localhost";
    const logger = new LogManager(context);
    const keyVault = new vault(host, logger, cache);

    tableStorage = new TableStorageDataSource(logger, keyVault);
    await tableStorage.init();
    return tableStorage;
}

export async function analyticsTrack(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
        return { status: 204, headers: corsHeaders };
    }

    try {
        const userAgent = request.headers.get("user-agent") || "";
        if (isBot(userAgent)) {
            return { status: 204, headers: corsHeaders };
        }

        const data = (await request.json()) as AnalyticsPayload;

        if (!data.sessionId || !data.url || !data.eventType) {
            return { status: 400, headers: corsHeaders };
        }

        const now = new Date();
        const partitionKey = now.toISOString().slice(0, 10);
        const hex = Math.random().toString(16).slice(2, 10);
        const rowKey = `${now.getTime()}-${hex}`;

        const acceptLanguage = request.headers.get("accept-language");

        const storage = await getTableStorage(request, context);
        await storage.createEntity("Analytics", {
            partitionKey,
            rowKey,
            sessionId: data.sessionId,
            url: data.url,
            referrer: data.referrer || "",
            screenWidth: data.screenWidth || 0,
            screenHeight: data.screenHeight || 0,
            browserName: parseBrowser(userAgent),
            osName: parseOS(userAgent),
            deviceType: parseDeviceType(userAgent),
            country: parseCountryFromAcceptLanguage(acceptLanguage),
            utmSource: data.utmSource || "",
            utmMedium: data.utmMedium || "",
            utmCampaign: data.utmCampaign || "",
            utmTerm: data.utmTerm || "",
            utmContent: data.utmContent || "",
            scrollDepth: data.scrollDepth ?? 0,
            timeOnPage: data.timeOnPage ?? 0,
            eventType: data.eventType,
            timestamp: now.toISOString(),
        });

        return { status: 204, headers: corsHeaders };
    } catch (error) {
        context.error("Analytics tracking error:", error);
        return { status: 204, headers: corsHeaders };
    }
}

app.http("analytics-track", {
    methods: ["POST", "OPTIONS"],
    authLevel: "anonymous",
    handler: analyticsTrack,
});
