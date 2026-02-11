import { AnalyticsBreakdownStat } from "../types";

interface BreakdownChartProps {
    title: string;
    data: AnalyticsBreakdownStat[];
    testIdPrefix: string;
    color?: string;
}

const COLOR_PALETTE = [
    "rgb(59, 130, 246)",   // blue-500
    "rgb(34, 197, 94)",    // green-500
    "rgb(168, 85, 247)",   // purple-500
    "rgb(249, 115, 22)",   // orange-500
    "rgb(6, 182, 212)",    // cyan-500
    "rgb(236, 72, 153)",   // pink-500
    "rgb(234, 179, 8)",    // yellow-500
    "rgb(239, 68, 68)",    // red-500
];

export default function BreakdownChart({ title, data, testIdPrefix, color }: BreakdownChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm" data-testid={`${testIdPrefix}-empty`}>
                No data available
            </div>
        );
    }

    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div data-testid={`${testIdPrefix}-chart`}>
            <h3 className="text-sm font-medium text-slate-300 mb-3">{title}</h3>
            <div className="space-y-2">
                {data.slice(0, 10).map((item, i) => {
                    const barWidth = (item.count / maxCount) * 100;
                    const barColor = color || COLOR_PALETTE[i % COLOR_PALETTE.length];

                    return (
                        <div
                            key={item.name}
                            className="flex items-center space-x-3"
                            data-testid={`${testIdPrefix}-row-${item.name.toLowerCase().replace(/\s/g, "-")}`}
                        >
                            <span className="text-xs text-slate-300 w-24 truncate text-right" title={item.name}>
                                {item.name}
                            </span>
                            <div className="flex-1 h-6 bg-slate-800/30 rounded overflow-hidden relative">
                                <div
                                    className="h-full rounded transition-all duration-500"
                                    style={{
                                        width: `${Math.max(barWidth, 1)}%`,
                                        backgroundColor: barColor,
                                        opacity: 0.7,
                                    }}
                                />
                                <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium">
                                    {item.count > 0 && item.count.toLocaleString()}
                                </span>
                            </div>
                            <span className="text-xs text-slate-400 w-12 text-right">
                                {item.percentage}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
