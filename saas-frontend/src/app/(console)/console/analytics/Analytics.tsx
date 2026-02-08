"use client";

import { useState } from "react";
import { AlertCircle, BarChart3 } from "lucide-react";
import useAnalytics from "./hooks/UseAnalytics";
import useAnalyticsRealtime from "./hooks/UseAnalyticsRealtime";
import DateRangePicker from "./components/DateRangePicker";
import SummaryCards from "./components/SummaryCards";
import PageviewsChart from "./components/PageviewsChart";
import TopPagesTable from "./components/TopPagesTable";
import TopReferrersTable from "./components/TopReferrersTable";
import BreakdownChart from "./components/BreakdownChart";
import RealtimeIndicator from "./components/RealtimeIndicator";

type SubTab = "overview" | "pages" | "referrers" | "geography" | "devices";

const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "pages", label: "Pages" },
    { key: "referrers", label: "Referrers" },
    { key: "geography", label: "Geography" },
    { key: "devices", label: "Devices" },
];

function formatDateForInput(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return formatDateForInput(d);
}

export default function Analytics() {
    const [subTab, setSubTab] = useState<SubTab>("overview");
    const [startDate, setStartDate] = useState(daysAgo(30));
    const [endDate, setEndDate] = useState(formatDateForInput(new Date()));

    const { data, isLoading, error } = useAnalytics(startDate, endDate);
    const realtime = useAnalyticsRealtime();

    const handleRangeChange = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
    };

    return (
        <div className="h-full overflow-y-auto" data-testid="analytics-dashboard">
            <div className="w-full px-6 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onRangeChange={handleRangeChange}
                        />
                    </div>
                    <RealtimeIndicator data={realtime.data} isLoading={realtime.isLoading} />
                </div>

                {/* Sub-tabs */}
                <div className="flex bg-slate-800 rounded-lg p-1 space-x-1 w-fit" data-testid="analytics-sub-tabs">
                    {SUB_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setSubTab(tab.key)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                subTab === tab.key
                                    ? "bg-slate-700 text-white"
                                    : "text-console-muted hover:text-console"
                            }`}
                            data-testid={`sub-tab-${tab.key}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center h-64" data-testid="analytics-loading">
                        <div className="flex items-center space-x-3">
                            <div className="animate-console-spin rounded-full h-6 w-6 border-2 border-console-primary border-t-transparent" />
                            <span className="text-console-muted text-sm">Loading analytics...</span>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="flex items-center justify-center h-64" data-testid="analytics-error">
                        <div className="text-center">
                            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                            <p className="text-red-400 text-sm">Failed to load analytics data</p>
                            <p className="text-slate-500 text-xs mt-1">Please try again later</p>
                        </div>
                    </div>
                )}

                {/* Empty state - no data collected yet */}
                {data && !isLoading && data.summary.totalPageviews === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-center" data-testid="analytics-empty">
                        <BarChart3 className="h-12 w-12 text-slate-500 mb-4" />
                        <p className="text-lg font-medium text-slate-300">No analytics data yet</p>
                        <p className="text-sm text-slate-500 mt-1 max-w-md">
                            Traffic data will appear here once visitors start browsing the site.
                            Analytics tracking is active on all customer-facing and blog pages.
                        </p>
                    </div>
                )}

                {/* Content */}
                {data && !isLoading && data.summary.totalPageviews > 0 && (
                    <>
                        {/* Overview tab */}
                        {subTab === "overview" && (
                            <div className="space-y-6" data-testid="tab-overview">
                                <SummaryCards summary={data.summary} />
                                <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                                    <PageviewsChart dailyCounts={data.dailyCounts} />
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                                        <TopPagesTable pages={data.topPages.slice(0, 10)} />
                                    </div>
                                    <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                                        <TopReferrersTable referrers={data.topReferrers.slice(0, 10)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pages tab */}
                        {subTab === "pages" && (
                            <div className="space-y-6" data-testid="tab-pages">
                                <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                                    <TopPagesTable pages={data.topPages} />
                                </div>
                            </div>
                        )}

                        {/* Referrers tab */}
                        {subTab === "referrers" && (
                            <div className="space-y-6" data-testid="tab-referrers">
                                <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                                    <TopReferrersTable referrers={data.topReferrers} />
                                </div>
                            </div>
                        )}

                        {/* Geography tab */}
                        {subTab === "geography" && (
                            <div className="space-y-6" data-testid="tab-geography">
                                <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                                    <BreakdownChart
                                        title="Countries"
                                        data={data.countries}
                                        testIdPrefix="countries"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Devices tab */}
                        {subTab === "devices" && (
                            <div className="space-y-6" data-testid="tab-devices">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                                        <BreakdownChart
                                            title="Browsers"
                                            data={data.browsers}
                                            testIdPrefix="browsers"
                                        />
                                    </div>
                                    <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                                        <BreakdownChart
                                            title="Operating Systems"
                                            data={data.operatingSystems}
                                            testIdPrefix="os"
                                        />
                                    </div>
                                    <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                                        <BreakdownChart
                                            title="Device Types"
                                            data={data.devices}
                                            testIdPrefix="devices"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
