export interface AnalyticsSummary {
    totalPageviews: number;
    uniqueVisitors: number;
    avgSessionDuration: number;
    bounceRate: number;
    avgScrollDepth: number;
    avgTimeOnPage: number;
}

export interface AnalyticsDailyCount {
    date: string;
    pageviews: number;
    uniqueVisitors: number;
}

export interface AnalyticsPageStat {
    url: string;
    views: number;
    uniqueVisitors: number;
    avgTimeOnPage: number;
    avgScrollDepth: number;
}

export interface AnalyticsReferrerStat {
    referrer: string;
    views: number;
    uniqueVisitors: number;
}

export interface AnalyticsBreakdownStat {
    name: string;
    count: number;
    percentage: number;
}

export interface RealtimePageStat {
    url: string;
    visitors: number;
}

export interface ConsoleAnalyticsDashboard {
    summary: AnalyticsSummary;
    dailyCounts: AnalyticsDailyCount[];
    topPages: AnalyticsPageStat[];
    topReferrers: AnalyticsReferrerStat[];
    browsers: AnalyticsBreakdownStat[];
    operatingSystems: AnalyticsBreakdownStat[];
    devices: AnalyticsBreakdownStat[];
    countries: AnalyticsBreakdownStat[];
}

export interface ConsoleAnalyticsRealtime {
    activeVisitors: number;
    currentPages: RealtimePageStat[];
}
