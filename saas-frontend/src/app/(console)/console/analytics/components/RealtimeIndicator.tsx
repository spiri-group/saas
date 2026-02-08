import { ConsoleAnalyticsRealtime } from "../types";

interface RealtimeIndicatorProps {
    data: ConsoleAnalyticsRealtime | undefined;
    isLoading: boolean;
}

export default function RealtimeIndicator({ data, isLoading }: RealtimeIndicatorProps) {
    if (isLoading || !data) {
        return (
            <div className="flex items-center space-x-2" data-testid="realtime-loading">
                <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                <span className="text-xs text-slate-400">Loading...</span>
            </div>
        );
    }

    return (
        <div data-testid="realtime-indicator">
            <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                    </div>
                    <span className="text-sm font-medium text-white" data-testid="active-visitors-count">
                        {data.activeVisitors}
                    </span>
                    <span className="text-xs text-slate-400">
                        active {data.activeVisitors === 1 ? "visitor" : "visitors"}
                    </span>
                </div>
            </div>

            {data.currentPages.length > 0 && (
                <div className="mt-3 space-y-1" data-testid="realtime-pages">
                    {data.currentPages.map(page => (
                        <div
                            key={page.url}
                            className="flex items-center justify-between text-xs"
                            data-testid={`realtime-page-${page.url}`}
                        >
                            <span className="text-slate-300 truncate mr-4 font-mono" title={page.url}>
                                {page.url}
                            </span>
                            <span className="text-green-400 font-medium flex-shrink-0">
                                {page.visitors}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
