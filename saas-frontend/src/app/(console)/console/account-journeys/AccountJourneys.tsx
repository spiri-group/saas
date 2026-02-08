'use client';

import { useState, useCallback } from 'react';
import { GitBranch, RefreshCw, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import useAccountJourneys from './hooks/UseAccountJourneys';
import FunnelVisualization from './components/FunnelVisualization';
import MilestoneCard from './components/MilestoneCard';
import { JourneySubTab, STAGE_LABELS } from './types';

interface AccountJourneysProps {
    onNavigateToAccounts?: (stage: string) => void;
}

export default function AccountJourneys({ onNavigateToAccounts }: AccountJourneysProps) {
    const [activeTab, setActiveTab] = useState<JourneySubTab>('activation-funnel');
    const journeysQuery = useAccountJourneys();

    const data = journeysQuery.data;

    const handleExportCsv = useCallback(() => {
        if (!data) return;

        const rows: string[][] = [];

        // Funnel data
        rows.push(['--- Activation Funnel ---']);
        rows.push(['Stage', 'Count', 'Merchants', 'Practitioners', '% of Total']);
        for (const s of data.vendorFunnel.stages) {
            rows.push([
                STAGE_LABELS[s.stage] || s.stage,
                String(s.count),
                String(s.merchantCount),
                String(s.practitionerCount),
                `${s.percentOfTotal}%`,
            ]);
        }
        if (data.vendorFunnel.problemStates.length > 0) {
            rows.push([]);
            rows.push(['--- Problem States ---']);
            rows.push(['Stage', 'Count', 'Merchants', 'Practitioners', '% of Total']);
            for (const s of data.vendorFunnel.problemStates) {
                rows.push([
                    STAGE_LABELS[s.stage] || s.stage,
                    String(s.count),
                    String(s.merchantCount),
                    String(s.practitionerCount),
                    `${s.percentOfTotal}%`,
                ]);
            }
        }

        // Vendor milestones
        rows.push([]);
        rows.push(['--- Vendor Milestones ---']);
        rows.push(['Milestone', 'Achieved', 'Eligible', '%', 'Median Days', 'Avg Days', 'This Week']);
        for (const m of data.vendorMilestones) {
            rows.push([
                m.label,
                String(m.achievedCount),
                String(m.totalEligible),
                `${m.achievedPercent}%`,
                m.medianDays !== null ? String(m.medianDays) : '',
                m.averageDays !== null ? String(m.averageDays) : '',
                m.recentCount !== null ? String(m.recentCount) : '',
            ]);
        }

        // Customer milestones
        rows.push([]);
        rows.push(['--- Customer Milestones ---']);
        rows.push(['Milestone', 'Achieved', 'Eligible', '%', 'Median Days', 'Avg Days', 'This Week']);
        for (const m of data.customerMilestones) {
            rows.push([
                m.label,
                String(m.achievedCount),
                String(m.totalEligible),
                `${m.achievedPercent}%`,
                m.medianDays !== null ? String(m.medianDays) : '',
                m.averageDays !== null ? String(m.averageDays) : '',
                m.recentCount !== null ? String(m.recentCount) : '',
            ]);
        }

        const escapeCsvField = (field: string) => {
            if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        };

        const csvContent = rows.map(row => row.map(escapeCsvField).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'account-journeys-export.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [data]);

    return (
        <div className="h-full flex flex-col" data-testid="account-journeys">
            {/* Header */}
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                            <GitBranch className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-white">Account Journeys</h1>
                            <p className="text-sm text-slate-400">
                                Activation funnels, conversion rates, and milestone tracking
                                {journeysQuery.dataUpdatedAt ? (
                                    <span className="ml-2 text-slate-500" data-testid="last-updated">
                                        &middot; Updated {formatDistanceToNow(journeysQuery.dataUpdatedAt, { addSuffix: true })}
                                    </span>
                                ) : null}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCsv}
                            disabled={!data}
                            className="border-slate-700 hover:bg-slate-800"
                            data-testid="export-journeys-csv-btn"
                        >
                            <Download className="h-4 w-4" />
                            <span className="ml-2">Export CSV</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => journeysQuery.refetch()}
                            disabled={journeysQuery.isRefetching}
                            className="border-slate-700 hover:bg-slate-800"
                            data-testid="refresh-journeys-btn"
                        >
                            {journeysQuery.isRefetching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="ml-2">Refresh</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="p-4 border-b border-slate-800">
                <div className="flex bg-slate-800 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('activation-funnel')}
                        data-testid="activation-funnel-tab"
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            activeTab === 'activation-funnel'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Activation Funnel
                    </button>
                    <button
                        onClick={() => setActiveTab('vendor-milestones')}
                        data-testid="vendor-milestones-tab"
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            activeTab === 'vendor-milestones'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Vendor Milestones
                    </button>
                    <button
                        onClick={() => setActiveTab('customer-milestones')}
                        data-testid="customer-milestones-tab"
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            activeTab === 'customer-milestones'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Customer Milestones
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {journeysQuery.isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex items-center space-x-3">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            <span className="text-slate-400 text-sm">Loading journey data...</span>
                        </div>
                    </div>
                ) : journeysQuery.isError ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <p className="text-red-400 text-sm">Failed to load journey data</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => journeysQuery.refetch()}
                                className="mt-3 border-slate-700"
                                data-testid="retry-journeys-btn"
                            >
                                Retry
                            </Button>
                        </div>
                    </div>
                ) : data ? (
                    <>
                        {activeTab === 'activation-funnel' && (
                            <FunnelVisualization
                                funnel={data.vendorFunnel}
                                onStageClick={onNavigateToAccounts}
                            />
                        )}

                        {activeTab === 'vendor-milestones' && (
                            <div className="space-y-4" data-testid="vendor-milestones-grid">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-medium text-slate-300">
                                        Vendor Milestones
                                    </h2>
                                    <span className="text-xs text-slate-500">
                                        {data.vendorFunnel.totalVendors} total vendors
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {data.vendorMilestones.map(milestone => (
                                        <MilestoneCard key={milestone.milestoneKey} milestone={milestone} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'customer-milestones' && (
                            <div className="space-y-4" data-testid="customer-milestones-grid">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-medium text-slate-300">
                                        Customer Milestones
                                    </h2>
                                    <span className="text-xs text-slate-500">
                                        {data.totalCustomers} total customers
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {data.customerMilestones.map(milestone => (
                                        <MilestoneCard key={milestone.milestoneKey} milestone={milestone} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
}
