export interface AnalyticsEntity {
    partitionKey: string;
    rowKey: string;
    sessionId: string;
    url: string;
    referrer: string;
    screenWidth: number;
    screenHeight: number;
    browserName: string;
    osName: string;
    deviceType: string;
    country: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmTerm: string;
    utmContent: string;
    scrollDepth: number;
    timeOnPage: number;
    eventType: string;
    timestamp: string;
}

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
    currentPages: { url: string; visitors: number }[];
}
