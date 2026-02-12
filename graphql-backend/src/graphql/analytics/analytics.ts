import { serverContext } from "../../services/azFunction";
import { TableStorageDataSource } from "../../services/tablestorage";
import { AnalyticsEntity } from "./types";

const ANALYTICS_TABLE = "Analytics";

function getTableStorage(context: serverContext): TableStorageDataSource {
    return context.dataSources.tableStorage;
}

function buildDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
}

function buildODataFilter(startDate: string, endDate: string): string {
    return `PartitionKey ge '${startDate}' and PartitionKey le '${endDate}'`;
}

function computeBreakdown(entities: AnalyticsEntity[], field: keyof AnalyticsEntity) {
    const counts = new Map<string, number>();
    for (const e of entities) {
        const val = (e[field] as string) || "Unknown";
        counts.set(val, (counts.get(val) || 0) + 1);
    }
    const total = entities.length || 1;
    return Array.from(counts.entries())
        .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / total) * 1000) / 10,
        }))
        .sort((a, b) => b.count - a.count);
}

const resolvers = {
    Query: {
        consoleAnalytics: async (
            _: any,
            args: { startDate: string; endDate: string },
            context: serverContext
        ) => {
            const ts = getTableStorage(context);
            const filter = buildODataFilter(args.startDate, args.endDate);
            const entities = await ts.queryEntities<AnalyticsEntity>(ANALYTICS_TABLE, filter);

            const pageviews = entities.filter(e => e.eventType === "pageview");
            const pageleaves = entities.filter(e => e.eventType === "pageleave");

            // Unique sessions
            const uniqueSessions = new Set(pageviews.map(e => e.sessionId));

            // Sessions with only 1 pageview = bounce
            const sessionPageCounts = new Map<string, number>();
            for (const e of pageviews) {
                sessionPageCounts.set(e.sessionId, (sessionPageCounts.get(e.sessionId) || 0) + 1);
            }
            const bounces = Array.from(sessionPageCounts.values()).filter(c => c === 1).length;
            const bounceRate = uniqueSessions.size > 0
                ? Math.round((bounces / uniqueSessions.size) * 1000) / 10
                : 0;

            // Avg scroll depth and time on page from pageleave events
            const scrollDepths = pageleaves.filter(e => e.scrollDepth > 0).map(e => e.scrollDepth);
            const timesOnPage = pageleaves.filter(e => e.timeOnPage > 0).map(e => e.timeOnPage);

            const avgScrollDepth = scrollDepths.length > 0
                ? Math.round(scrollDepths.reduce((a, b) => a + b, 0) / scrollDepths.length * 10) / 10
                : 0;

            const avgTimeOnPage = timesOnPage.length > 0
                ? Math.round(timesOnPage.reduce((a, b) => a + b, 0) / timesOnPage.length * 10) / 10
                : 0;

            // Avg session duration: sum timeOnPage per session, then average
            const sessionDurations = new Map<string, number>();
            for (const e of pageleaves) {
                sessionDurations.set(
                    e.sessionId,
                    (sessionDurations.get(e.sessionId) || 0) + (e.timeOnPage || 0)
                );
            }
            const durations = Array.from(sessionDurations.values());
            const avgSessionDuration = durations.length > 0
                ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 10) / 10
                : 0;

            // Daily counts
            const dateRange = buildDateRange(args.startDate, args.endDate);
            const dailyCounts = dateRange.map(date => {
                const dayViews = pageviews.filter(e => e.partitionKey === date);
                const daySessions = new Set(dayViews.map(e => e.sessionId));
                return {
                    date,
                    pageviews: dayViews.length,
                    uniqueVisitors: daySessions.size,
                };
            });

            // Top pages
            const pageMap = new Map<string, { views: number; sessions: Set<string>; scrollSum: number; scrollCount: number; timeSum: number; timeCount: number }>();
            for (const e of pageviews) {
                if (!pageMap.has(e.url)) {
                    pageMap.set(e.url, { views: 0, sessions: new Set(), scrollSum: 0, scrollCount: 0, timeSum: 0, timeCount: 0 });
                }
                const p = pageMap.get(e.url)!;
                p.views++;
                p.sessions.add(e.sessionId);
            }
            for (const e of pageleaves) {
                if (!pageMap.has(e.url)) continue;
                const p = pageMap.get(e.url)!;
                if (e.scrollDepth > 0) { p.scrollSum += e.scrollDepth; p.scrollCount++; }
                if (e.timeOnPage > 0) { p.timeSum += e.timeOnPage; p.timeCount++; }
            }
            const topPages = Array.from(pageMap.entries())
                .map(([url, s]) => ({
                    url,
                    views: s.views,
                    uniqueVisitors: s.sessions.size,
                    avgTimeOnPage: s.timeCount > 0 ? Math.round(s.timeSum / s.timeCount * 10) / 10 : 0,
                    avgScrollDepth: s.scrollCount > 0 ? Math.round(s.scrollSum / s.scrollCount * 10) / 10 : 0,
                }))
                .sort((a, b) => b.views - a.views)
                .slice(0, 20);

            // Top referrers
            const refMap = new Map<string, { views: number; sessions: Set<string> }>();
            for (const e of pageviews) {
                const ref = e.referrer || "(direct)";
                let domain: string;
                try {
                    domain = ref === "(direct)" ? "(direct)" : new URL(ref).hostname;
                } catch {
                    domain = ref;
                }
                if (!refMap.has(domain)) {
                    refMap.set(domain, { views: 0, sessions: new Set() });
                }
                const r = refMap.get(domain)!;
                r.views++;
                r.sessions.add(e.sessionId);
            }
            const topReferrers = Array.from(refMap.entries())
                .map(([referrer, s]) => ({
                    referrer,
                    views: s.views,
                    uniqueVisitors: s.sessions.size,
                }))
                .sort((a, b) => b.views - a.views)
                .slice(0, 20);

            // Breakdowns
            const browsers = computeBreakdown(pageviews, "browserName");
            const operatingSystems = computeBreakdown(pageviews, "osName");
            const devices = computeBreakdown(pageviews, "deviceType");
            const countries = computeBreakdown(pageviews, "country");

            return {
                summary: {
                    totalPageviews: pageviews.length,
                    uniqueVisitors: uniqueSessions.size,
                    avgSessionDuration,
                    bounceRate,
                    avgScrollDepth,
                    avgTimeOnPage,
                },
                dailyCounts,
                topPages,
                topReferrers,
                browsers,
                operatingSystems,
                devices,
                countries,
            };
        },

        consoleAnalyticsRealtime: async (_: any, _args: any, context: serverContext) => {
            const ts = getTableStorage(context);
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            const today = now.toISOString().slice(0, 10);

            const filter = `PartitionKey eq '${today}' and timestamp ge '${fiveMinutesAgo.toISOString()}'`;
            const entities = await ts.queryEntities<AnalyticsEntity>(ANALYTICS_TABLE, filter);

            const pageviews = entities.filter(e => e.eventType === "pageview");
            const uniqueSessions = new Set(pageviews.map(e => e.sessionId));

            // Current pages: group by URL, count unique sessions
            const pageVisitors = new Map<string, Set<string>>();
            for (const e of pageviews) {
                if (!pageVisitors.has(e.url)) {
                    pageVisitors.set(e.url, new Set());
                }
                pageVisitors.get(e.url)!.add(e.sessionId);
            }

            const currentPages = Array.from(pageVisitors.entries())
                .map(([url, sessions]) => ({ url, visitors: sessions.size }))
                .sort((a, b) => b.visitors - a.visitors)
                .slice(0, 10);

            return {
                activeVisitors: uniqueSessions.size,
                currentPages,
            };
        },
    },
};

export { resolvers };
