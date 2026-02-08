import { Eye, Users, Clock, ArrowUpDown, MousePointerClick, Timer } from "lucide-react";
import { AnalyticsSummary } from "../types";

interface SummaryCardsProps {
    summary: AnalyticsSummary;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
}

const CARDS = [
    {
        key: "pageviews",
        label: "Total Pageviews",
        icon: Eye,
        color: "text-blue-400",
        getValue: (s: AnalyticsSummary) => s.totalPageviews.toLocaleString(),
    },
    {
        key: "visitors",
        label: "Unique Visitors",
        icon: Users,
        color: "text-green-400",
        getValue: (s: AnalyticsSummary) => s.uniqueVisitors.toLocaleString(),
    },
    {
        key: "session-duration",
        label: "Avg Session Duration",
        icon: Clock,
        color: "text-purple-400",
        getValue: (s: AnalyticsSummary) => formatDuration(s.avgSessionDuration),
    },
    {
        key: "bounce-rate",
        label: "Bounce Rate",
        icon: MousePointerClick,
        color: "text-orange-400",
        getValue: (s: AnalyticsSummary) => `${s.bounceRate}%`,
    },
    {
        key: "scroll-depth",
        label: "Avg Scroll Depth",
        icon: ArrowUpDown,
        color: "text-cyan-400",
        getValue: (s: AnalyticsSummary) => `${s.avgScrollDepth}%`,
    },
    {
        key: "time-on-page",
        label: "Avg Time on Page",
        icon: Timer,
        color: "text-yellow-400",
        getValue: (s: AnalyticsSummary) => formatDuration(s.avgTimeOnPage),
    },
];

export default function SummaryCards({ summary }: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="summary-cards">
            {CARDS.map(card => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.key}
                        className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
                        data-testid={`summary-card-${card.key}`}
                    >
                        <div className="flex items-center space-x-2 mb-2">
                            <Icon className={`h-4 w-4 ${card.color}`} />
                            <span className="text-xs text-slate-400">{card.label}</span>
                        </div>
                        <p className="text-xl font-semibold text-white">{card.getValue(summary)}</p>
                    </div>
                );
            })}
        </div>
    );
}
