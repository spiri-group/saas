import { VendorFunnelAnalysis, STAGE_LABELS, STAGE_COLORS } from '../types';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, GitBranch } from 'lucide-react';

interface FunnelVisualizationProps {
    funnel: VendorFunnelAnalysis;
    onStageClick?: (stage: string) => void;
    selectedStage?: string | null;
}

function getConversionColor(rate: number): string {
    if (rate >= 70) return 'text-green-400';
    if (rate >= 30) return 'text-yellow-400';
    return 'text-red-400';
}

function getConversionBg(rate: number): string {
    if (rate >= 70) return 'bg-green-500/10 border-green-500/20';
    if (rate >= 30) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
}

function getConversionIcon(rate: number) {
    if (rate >= 70) return <TrendingUp className="h-3 w-3" />;
    if (rate >= 30) return <Minus className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
}

export default function FunnelVisualization({ funnel, onStageClick, selectedStage }: FunnelVisualizationProps) {
    const maxCount = funnel.stages.length > 0 ? funnel.stages[0].count : 1;

    // Empty state
    if (funnel.totalVendors === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400" data-testid="funnel-empty-state">
                <GitBranch className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No vendor accounts yet</p>
                <p className="text-sm">Funnel data will appear once vendors start signing up</p>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="funnel-visualization">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50" data-testid="total-vendors-stat">
                    <p className="text-sm text-slate-400">Total Vendors</p>
                    <p className="text-2xl font-semibold text-white">{funnel.totalVendors}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50" data-testid="total-merchants-stat">
                    <p className="text-sm text-slate-400">Merchants</p>
                    <p className="text-2xl font-semibold text-indigo-400">{funnel.totalMerchants}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50" data-testid="total-practitioners-stat">
                    <p className="text-sm text-slate-400">Practitioners</p>
                    <p className="text-2xl font-semibold text-purple-400">{funnel.totalPractitioners}</p>
                </div>
            </div>

            {/* Funnel Chart */}
            <div className="space-y-1" data-testid="funnel-chart">
                {funnel.stages.map((stage, index) => {
                    const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                    const merchantPct = stage.count > 0 ? (stage.merchantCount / stage.count) * 100 : 0;
                    const colors = STAGE_COLORS[stage.stage] || STAGE_COLORS.CREATED;
                    const label = STAGE_LABELS[stage.stage] || stage.stage;
                    const conversion = funnel.conversions[index - 1];
                    const isClickable = !!onStageClick;
                    const isSelected = selectedStage === stage.stage;

                    return (
                        <div key={stage.stage} data-testid={`funnel-stage-${stage.stage.toLowerCase()}`}>
                            {/* Conversion rate between stages */}
                            {conversion && (
                                <div className="flex items-center justify-center py-1">
                                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-xs ${getConversionBg(conversion.conversionRate)}`}>
                                        {getConversionIcon(conversion.conversionRate)}
                                        <span className={getConversionColor(conversion.conversionRate)}>
                                            {conversion.conversionRate}% conversion
                                        </span>
                                        <span className="text-slate-500">
                                            ({conversion.fromCount} &rarr; {conversion.toCount})
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Stage Bar */}
                            <div
                                className={`flex items-center space-x-4 ${isClickable ? 'cursor-pointer rounded-lg py-1 px-2 -mx-2 transition-colors' : ''} ${isSelected ? 'bg-slate-800/60 ring-1 ring-slate-600' : isClickable ? 'hover:bg-slate-800/30' : ''}`}
                                onClick={isClickable ? () => onStageClick!(stage.stage) : undefined}
                                data-testid={`funnel-stage-click-${stage.stage.toLowerCase()}`}
                            >
                                <div className="w-40 flex-shrink-0 text-right">
                                    <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
                                </div>
                                <div className="flex-1 relative">
                                    <div className="h-10 bg-slate-800/30 rounded-lg overflow-hidden" style={{ width: '100%' }}>
                                        <div
                                            className="h-full rounded-lg flex overflow-hidden transition-all duration-500"
                                            style={{ width: `${Math.max(widthPct, 2)}%` }}
                                        >
                                            {/* Merchant segment */}
                                            <div
                                                className="h-full bg-indigo-500/80"
                                                style={{ width: `${merchantPct}%` }}
                                                title={`Merchants: ${stage.merchantCount}`}
                                            />
                                            {/* Practitioner segment */}
                                            <div
                                                className="h-full bg-purple-500/80"
                                                style={{ width: `${100 - merchantPct}%` }}
                                                title={`Practitioners: ${stage.practitionerCount}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="w-32 flex-shrink-0">
                                    <span className="text-sm font-semibold text-white">{stage.count}</span>
                                    <span className="text-xs text-slate-400 ml-1">({stage.percentOfTotal}%)</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 pt-2">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-indigo-500/80" />
                    <span className="text-xs text-slate-400">Merchants</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-purple-500/80" />
                    <span className="text-xs text-slate-400">Practitioners</span>
                </div>
            </div>

            {/* Problem States */}
            {funnel.problemStates.length > 0 && (
                <div className="space-y-3" data-testid="problem-states-section">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-400" />
                        <h3 className="text-sm font-medium text-orange-400">Problem States</h3>
                    </div>
                    <div className="space-y-1">
                        {funnel.problemStates.map(stage => {
                            const widthPct = funnel.totalVendors > 0 ? (stage.count / funnel.totalVendors) * 100 : 0;
                            const merchantPct = stage.count > 0 ? (stage.merchantCount / stage.count) * 100 : 0;
                            const colors = STAGE_COLORS[stage.stage] || STAGE_COLORS.CREATED;
                            const label = STAGE_LABELS[stage.stage] || stage.stage;
                            const isClickable = !!onStageClick;
                            const isSelected = selectedStage === stage.stage;

                            return (
                                <div
                                    key={stage.stage}
                                    className={`flex items-center space-x-4 ${isClickable ? 'cursor-pointer rounded-lg py-1 px-2 -mx-2 transition-colors' : ''} ${isSelected ? 'bg-slate-800/60 ring-1 ring-slate-600' : isClickable ? 'hover:bg-slate-800/30' : ''}`}
                                    onClick={isClickable ? () => onStageClick!(stage.stage) : undefined}
                                    data-testid={`problem-stage-${stage.stage.toLowerCase()}`}
                                >
                                    <div className="w-40 flex-shrink-0 text-right">
                                        <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
                                    </div>
                                    <div className="flex-1 relative">
                                        <div className="h-10 bg-slate-800/30 rounded-lg overflow-hidden" style={{ width: '100%' }}>
                                            <div
                                                className="h-full rounded-lg flex overflow-hidden transition-all duration-500"
                                                style={{ width: `${Math.max(widthPct, 2)}%` }}
                                            >
                                                <div
                                                    className="h-full bg-indigo-500/80"
                                                    style={{ width: `${merchantPct}%` }}
                                                    title={`Merchants: ${stage.merchantCount}`}
                                                />
                                                <div
                                                    className="h-full bg-purple-500/80"
                                                    style={{ width: `${100 - merchantPct}%` }}
                                                    title={`Practitioners: ${stage.practitionerCount}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-32 flex-shrink-0">
                                        <span className="text-sm font-semibold text-white">{stage.count}</span>
                                        <span className="text-xs text-slate-400 ml-1">({stage.percentOfTotal}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Time to Stage Table */}
            <TimeToStageTable stages={funnel.stages} />
        </div>
    );
}

function TimeToStageTable({ stages }: { stages: VendorFunnelAnalysis['stages'] }) {
    const stagesWithTime = stages.filter(s => s.medianDaysToReach !== null || s.averageDaysToReach !== null);

    if (stagesWithTime.length === 0) return null;

    return (
        <div data-testid="time-to-stage-table">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Time to Reach Stage</h3>
            <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700/50">
                            <th className="text-left px-4 py-2 text-slate-400 font-medium">Stage</th>
                            <th className="text-right px-4 py-2 text-slate-400 font-medium">Median Days</th>
                            <th className="text-right px-4 py-2 text-slate-400 font-medium">Average Days</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stagesWithTime.map(stage => {
                            const colors = STAGE_COLORS[stage.stage] || STAGE_COLORS.CREATED;
                            return (
                                <tr key={stage.stage} className="border-b border-slate-700/30 last:border-0">
                                    <td className={`px-4 py-2 ${colors.text} font-medium`}>
                                        {STAGE_LABELS[stage.stage] || stage.stage}
                                    </td>
                                    <td className="px-4 py-2 text-right text-white">
                                        {stage.medianDaysToReach !== null ? `${stage.medianDaysToReach} days` : '\u2014'}
                                    </td>
                                    <td className="px-4 py-2 text-right text-white">
                                        {stage.averageDaysToReach !== null ? `${stage.averageDaysToReach} days` : '\u2014'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
