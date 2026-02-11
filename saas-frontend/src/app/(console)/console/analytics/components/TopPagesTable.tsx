import { AnalyticsPageStat } from "../types";

interface TopPagesTableProps {
    pages: AnalyticsPageStat[];
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
}

export default function TopPagesTable({ pages }: TopPagesTableProps) {
    if (pages.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm" data-testid="top-pages-empty">
                No page data available
            </div>
        );
    }

    return (
        <div data-testid="top-pages-table">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Top Pages</h3>
            <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700/50">
                            <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Page</th>
                            <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Views</th>
                            <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Visitors</th>
                            <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Avg Time</th>
                            <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Avg Scroll</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pages.map(page => (
                            <tr
                                key={page.url}
                                className="border-b border-slate-700/30 last:border-0 hover:bg-slate-800/40"
                                data-testid={`page-row-${page.url}`}
                            >
                                <td className="px-4 py-2.5 text-white font-mono text-xs truncate max-w-[300px]" title={page.url}>
                                    {page.url}
                                </td>
                                <td className="px-4 py-2.5 text-right text-white">{page.views.toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right text-slate-300">{page.uniqueVisitors.toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right text-slate-300">{formatDuration(page.avgTimeOnPage)}</td>
                                <td className="px-4 py-2.5 text-right text-slate-300">{page.avgScrollDepth}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
