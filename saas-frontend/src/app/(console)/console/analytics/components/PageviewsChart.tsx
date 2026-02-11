import { AnalyticsDailyCount } from "../types";

interface PageviewsChartProps {
    dailyCounts: AnalyticsDailyCount[];
}

function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

export default function PageviewsChart({ dailyCounts }: PageviewsChartProps) {
    const maxPageviews = Math.max(...dailyCounts.map(d => d.pageviews), 1);
    const maxVisitors = Math.max(...dailyCounts.map(d => d.uniqueVisitors), 1);
    const maxVal = Math.max(maxPageviews, maxVisitors);

    if (dailyCounts.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm" data-testid="pageviews-chart-empty">
                No data for the selected period
            </div>
        );
    }

    // Show fewer labels when there are many days
    const labelInterval = dailyCounts.length > 30 ? 7 : dailyCounts.length > 14 ? 3 : 1;

    return (
        <div data-testid="pageviews-chart">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-300">Pageviews Over Time</h3>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 rounded bg-blue-500/80" />
                        <span className="text-xs text-slate-400">Pageviews</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 rounded bg-green-500/80" />
                        <span className="text-xs text-slate-400">Unique Visitors</span>
                    </div>
                </div>
            </div>

            {/* Chart area */}
            <div className="relative h-48">
                {/* Y-axis guidelines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[1, 0.75, 0.5, 0.25, 0].map(pct => (
                        <div key={pct} className="flex items-center">
                            <span className="text-xs text-slate-500 w-10 text-right mr-2">
                                {Math.round(maxVal * pct)}
                            </span>
                            <div className="flex-1 border-t border-slate-700/30" />
                        </div>
                    ))}
                </div>

                {/* Bars */}
                <div className="absolute left-12 right-0 bottom-0 top-0 flex items-end space-x-px">
                    {dailyCounts.map((day, i) => {
                        const pvHeight = maxVal > 0 ? (day.pageviews / maxVal) * 100 : 0;
                        const uvHeight = maxVal > 0 ? (day.uniqueVisitors / maxVal) * 100 : 0;

                        return (
                            <div
                                key={day.date}
                                className="flex-1 flex flex-col items-center justify-end h-full group relative"
                                data-testid={`chart-bar-${day.date}`}
                            >
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                    <div className="bg-slate-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg border border-slate-600">
                                        <p className="text-white font-medium">{formatDateLabel(day.date)}</p>
                                        <p className="text-blue-400">Pageviews: {day.pageviews}</p>
                                        <p className="text-green-400">Visitors: {day.uniqueVisitors}</p>
                                    </div>
                                </div>

                                {/* Bars */}
                                <div className="w-full flex items-end justify-center space-x-px" style={{ height: "calc(100% - 20px)" }}>
                                    <div
                                        className="w-[45%] bg-blue-500/70 rounded-t-sm transition-all duration-300 min-h-[1px]"
                                        style={{ height: `${Math.max(pvHeight, 0.5)}%` }}
                                    />
                                    <div
                                        className="w-[45%] bg-green-500/70 rounded-t-sm transition-all duration-300 min-h-[1px]"
                                        style={{ height: `${Math.max(uvHeight, 0.5)}%` }}
                                    />
                                </div>

                                {/* X label */}
                                {i % labelInterval === 0 && (
                                    <span className="text-[10px] text-slate-500 mt-1 truncate w-full text-center">
                                        {formatDateLabel(day.date)}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
