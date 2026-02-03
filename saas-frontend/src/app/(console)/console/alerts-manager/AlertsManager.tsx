'use client';

import { useState } from 'react';
import { PlatformAlert, AlertStatus, AlertSeverity } from './types';
import { AlertStatusBadge, AlertSeverityBadge, AlertTypeBadge } from './components/AlertStatusBadge';
import AlertDetailPanel from './components/AlertDetailPanel';
import usePlatformAlerts from './hooks/UsePlatformAlerts';
import usePlatformAlertStats from './hooks/UsePlatformAlertStats';
import useAlertsRealTime from './hooks/UseAlertsRealTime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Search, RefreshCw, Loader2, Bell, Clock, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AlertsManager() {
    const [selectedAlert, setSelectedAlert] = useState<PlatformAlert | null>(null);
    const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
    const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Enable real-time updates
    useAlertsRealTime();

    // Fetch alerts with filters
    const alertsQuery = usePlatformAlerts({
        alertStatuses: statusFilter !== 'all' ? [statusFilter] : undefined,
        severities: severityFilter !== 'all' ? [severityFilter] : undefined,
        searchTerm: searchTerm || undefined,
    });

    // Fetch stats
    const statsQuery = usePlatformAlertStats();

    const stats = statsQuery.data;
    const alerts = alertsQuery.data?.alerts || [];

    return (
        <div className="h-full flex flex-col">
            {/* Header with Stats */}
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-white">Platform Alerts</h1>
                            <p className="text-sm text-slate-400">Monitor and respond to system alerts</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            alertsQuery.refetch();
                            statsQuery.refetch();
                        }}
                        disabled={alertsQuery.isRefetching}
                        className="border-slate-700 hover:bg-slate-800"
                    >
                        {alertsQuery.isRefetching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2">Refresh</span>
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-5 gap-4">
                    <StatCard
                        label="Critical"
                        value={stats?.bySeverity.critical || 0}
                        icon={<AlertTriangle className="h-4 w-4" />}
                        className="bg-red-500/10 text-red-400 border-red-500/20"
                    />
                    <StatCard
                        label="High"
                        value={stats?.bySeverity.high || 0}
                        icon={<Bell className="h-4 w-4" />}
                        className="bg-orange-500/10 text-orange-400 border-orange-500/20"
                    />
                    <StatCard
                        label="New"
                        value={stats?.byStatus.new || 0}
                        icon={<Clock className="h-4 w-4" />}
                        className="bg-blue-500/10 text-blue-400 border-blue-500/20"
                    />
                    <StatCard
                        label="Investigating"
                        value={stats?.byStatus.investigating || 0}
                        icon={<Search className="h-4 w-4" />}
                        className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    />
                    <StatCard
                        label="Resolved"
                        value={stats?.byStatus.resolved || 0}
                        icon={<CheckCircle className="h-4 w-4" />}
                        className="bg-green-500/10 text-green-400 border-green-500/20"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-800 flex items-center space-x-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by code, title, or message..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-800 border-slate-700"
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AlertStatus | 'all')}>
                    <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                        <SelectItem value="AWAITING_RESPONSE">Awaiting Response</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="DISMISSED">Dismissed</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as AlertSeverity | 'all')}>
                    <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Filter by severity" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex min-h-0">
                {/* Alerts List */}
                <div className={`flex-1 overflow-y-auto ${selectedAlert ? 'border-r border-slate-800' : ''}`}>
                    {alertsQuery.isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <CheckCircle className="h-12 w-12 mb-4" />
                            <p className="text-lg font-medium">No alerts found</p>
                            <p className="text-sm">Everything is running smoothly</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {alerts.map((alert) => (
                                <AlertRow
                                    key={alert.id}
                                    alert={alert}
                                    isSelected={selectedAlert?.id === alert.id}
                                    onClick={() => setSelectedAlert(alert)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                {selectedAlert && (
                    <div className="w-[480px] flex-shrink-0">
                        <AlertDetailPanel
                            alert={selectedAlert}
                            onClose={() => setSelectedAlert(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    className?: string;
}

function StatCard({ label, value, icon, className }: StatCardProps) {
    return (
        <div className={`p-4 rounded-lg border ${className}`}>
            <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{value}</span>
                {icon}
            </div>
            <span className="text-sm opacity-70">{label}</span>
        </div>
    );
}

interface AlertRowProps {
    alert: PlatformAlert;
    isSelected: boolean;
    onClick: () => void;
}

function AlertRow({ alert, isSelected, onClick }: AlertRowProps) {
    const severityIndicator: Record<AlertSeverity, string> = {
        CRITICAL: 'bg-red-500',
        HIGH: 'bg-orange-500',
        MEDIUM: 'bg-yellow-500',
        LOW: 'bg-slate-500',
    };

    return (
        <div
            onClick={onClick}
            className={`p-4 cursor-pointer transition-colors ${
                isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'
            }`}
        >
            <div className="flex items-start space-x-3">
                {/* Severity Indicator */}
                <div className={`w-1 h-12 rounded-full ${severityIndicator[alert.severity]}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-white">{alert.code}</span>
                            <AlertTypeBadge type={alert.alertType} />
                        </div>
                        <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(alert.createdDate), { addSuffix: true })}
                        </span>
                    </div>

                    <p className="text-sm text-slate-300 truncate mb-2">{alert.title}</p>

                    <div className="flex items-center space-x-2">
                        <AlertStatusBadge status={alert.alertStatus} />
                        <AlertSeverityBadge severity={alert.severity} />
                        {alert.customerEmail && (
                            <span className="text-xs text-slate-500 truncate max-w-[150px]">
                                {alert.customerEmail}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
