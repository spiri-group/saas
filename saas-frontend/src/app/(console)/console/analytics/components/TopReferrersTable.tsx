import { AnalyticsReferrerStat } from "../types";

interface TopReferrersTableProps {
    referrers: AnalyticsReferrerStat[];
}

export default function TopReferrersTable({ referrers }: TopReferrersTableProps) {
    if (referrers.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm" data-testid="top-referrers-empty">
                No referrer data available
            </div>
        );
    }

    return (
        <div data-testid="top-referrers-table">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Top Referrers</h3>
            <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700/50">
                            <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Source</th>
                            <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Views</th>
                            <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Visitors</th>
                        </tr>
                    </thead>
                    <tbody>
                        {referrers.map(ref => (
                            <tr
                                key={ref.referrer}
                                className="border-b border-slate-700/30 last:border-0 hover:bg-slate-800/40"
                                data-testid={`referrer-row-${ref.referrer}`}
                            >
                                <td className="px-4 py-2.5 text-white truncate max-w-[300px]" title={ref.referrer}>
                                    {ref.referrer}
                                </td>
                                <td className="px-4 py-2.5 text-right text-white">{ref.views.toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right text-slate-300">{ref.uniqueVisitors.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
