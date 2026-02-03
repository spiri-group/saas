'use client';

import { useState } from 'react';
import { PlatformAlert, AlertStatus } from '../types';
import { AlertStatusBadge, AlertSeverityBadge, AlertTypeBadge } from './AlertStatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, User, Building2, Clock, MessageSquare, Code, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useUpdateAlertStatus from '../hooks/UseUpdateAlertStatus';
import ChatControl from '@/components/ux/ChatControl';
import { CommunicationModeType } from '@/utils/spiriverse';

interface AlertDetailPanelProps {
    alert: PlatformAlert;
    onClose: () => void;
}

export default function AlertDetailPanel({ alert, onClose }: AlertDetailPanelProps) {
    const [resolutionNotes, setResolutionNotes] = useState(alert.resolutionNotes || '');
    const [selectedStatus, setSelectedStatus] = useState<AlertStatus>(alert.alertStatus);
    const updateStatus = useUpdateAlertStatus();

    const handleUpdateStatus = async () => {
        await updateStatus.mutateAsync({
            id: alert.id,
            alertStatus: selectedStatus,
            resolutionNotes: resolutionNotes || undefined,
        });
    };

    const statusOptions: { value: AlertStatus; label: string }[] = [
        { value: 'NEW', label: 'New' },
        { value: 'INVESTIGATING', label: 'Investigating' },
        { value: 'AWAITING_RESPONSE', label: 'Awaiting Response' },
        { value: 'RESOLVED', label: 'Resolved' },
        { value: 'DISMISSED', label: 'Dismissed' },
    ];

    return (
        <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-medium text-white">{alert.code}</h2>
                        <p className="text-xs text-slate-400">{alert.title}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
                <TabsList className="px-4 pt-2 bg-transparent border-b border-slate-800 justify-start rounded-none h-auto">
                    <TabsTrigger
                        value="details"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent"
                    >
                        Details
                    </TabsTrigger>
                    <TabsTrigger
                        value="context"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent"
                    >
                        Context
                    </TabsTrigger>
                    <TabsTrigger
                        value="chat"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent"
                    >
                        Chat
                    </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="flex-1 overflow-y-auto p-4 space-y-6 m-0">
                    {/* Status Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white">Status</h3>
                        <div className="flex items-center space-x-2">
                            <AlertStatusBadge status={alert.alertStatus} />
                            <AlertSeverityBadge severity={alert.severity} />
                            <AlertTypeBadge type={alert.alertType} />
                        </div>
                    </div>

                    {/* Update Status */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white">Update Status</h3>
                        <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as AlertStatus)}>
                            <SelectTrigger className="w-full bg-slate-800 border-slate-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Resolution Notes */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white">Resolution Notes</h3>
                        <Textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Add notes about the resolution..."
                            className="bg-slate-800 border-slate-700 min-h-[100px]"
                        />
                        <Button
                            onClick={handleUpdateStatus}
                            disabled={updateStatus.isPending || (selectedStatus === alert.alertStatus && resolutionNotes === (alert.resolutionNotes || ''))}
                            className="w-full"
                        >
                            {updateStatus.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Status'
                            )}
                        </Button>
                    </div>

                    {/* Affected Parties */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white">Affected Parties</h3>
                        <div className="space-y-2">
                            {(alert.customer || alert.customerEmail) && (
                                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <User className="h-4 w-4 text-blue-400" />
                                        <div>
                                            <p className="text-sm text-white">
                                                {alert.customer ? `${alert.customer.firstname} ${alert.customer.lastname}` : 'Customer'}
                                            </p>
                                            <p className="text-xs text-slate-400">{alert.customerEmail || alert.customer?.email}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {alert.merchant && (
                                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Building2 className="h-4 w-4 text-green-400" />
                                        <div>
                                            <p className="text-sm text-white">{alert.merchant.name}</p>
                                            <p className="text-xs text-slate-400">Merchant</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {!alert.customer && !alert.customerEmail && !alert.merchant && (
                                <p className="text-sm text-slate-400">No affected parties identified</p>
                            )}
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white">Timeline</h3>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-400">Created:</span>
                                <span className="text-white">
                                    {formatDistanceToNow(new Date(alert.createdDate), { addSuffix: true })}
                                </span>
                            </div>
                            {alert.resolvedAt && (
                                <div className="flex items-center space-x-2 text-sm">
                                    <Clock className="h-4 w-4 text-green-400" />
                                    <span className="text-slate-400">Resolved:</span>
                                    <span className="text-white">
                                        {formatDistanceToNow(new Date(alert.resolvedAt), { addSuffix: true })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* Context Tab */}
                <TabsContent value="context" className="flex-1 overflow-y-auto p-4 space-y-6 m-0">
                    {/* Message */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white">Message</h3>
                        <p className="text-sm text-slate-300 bg-slate-800 p-3 rounded-lg">{alert.message}</p>
                    </div>

                    {/* Source */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white">Source</h3>
                        <div className="bg-slate-800 p-3 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Component:</span>
                                <span className="text-white font-mono">{alert.source.component}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Environment:</span>
                                <span className="text-white">{alert.source.environment}</span>
                            </div>
                            {alert.source.version && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">Version:</span>
                                    <span className="text-white">{alert.source.version}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Context Details */}
                    {alert.context && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-white">Context Details</h3>
                            <div className="bg-slate-800 p-3 rounded-lg space-y-2">
                                {alert.context.orderId && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Order ID:</span>
                                        <span className="text-white font-mono text-xs">{alert.context.orderId}</span>
                                    </div>
                                )}
                                {alert.context.setupIntentId && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Setup Intent:</span>
                                        <span className="text-white font-mono text-xs">{alert.context.setupIntentId}</span>
                                    </div>
                                )}
                                {alert.context.url && (
                                    <div className="text-sm">
                                        <span className="text-slate-400">URL:</span>
                                        <p className="text-white font-mono text-xs mt-1 break-all">{alert.context.url}</p>
                                    </div>
                                )}
                                {alert.context.userAgent && (
                                    <div className="text-sm">
                                        <span className="text-slate-400">User Agent:</span>
                                        <p className="text-white font-mono text-xs mt-1 break-all">{alert.context.userAgent}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {alert.context?.errorMessage && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-white flex items-center">
                                <Code className="h-4 w-4 mr-2 text-red-400" />
                                Error Message
                            </h3>
                            <pre className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg text-xs text-red-300 overflow-x-auto">
                                {alert.context.errorMessage}
                            </pre>
                        </div>
                    )}

                    {/* Stack Trace */}
                    {alert.context?.stackTrace && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-white flex items-center">
                                <Code className="h-4 w-4 mr-2 text-orange-400" />
                                Stack Trace
                            </h3>
                            <pre className="bg-slate-800 p-3 rounded-lg text-xs text-slate-300 overflow-x-auto max-h-60">
                                {alert.context.stackTrace}
                            </pre>
                        </div>
                    )}
                </TabsContent>

                {/* Chat Tab */}
                <TabsContent value="chat" className="flex-1 overflow-hidden p-0 m-0">
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b border-slate-800">
                            <div className="flex items-center space-x-2">
                                <MessageSquare className="h-4 w-4 text-orange-400" />
                                <span className="text-sm text-slate-300">
                                    Use this chat to communicate about this alert with team members and affected parties.
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ChatControl
                                forObject={alert.ref}
                                title=""
                                withTitle={false}
                                defaultMode={CommunicationModeType.PLATFORM}
                                vendorSettings={{
                                    withCompanyLogo: true,
                                    withCompanyName: true,
                                    withUserName: true
                                }}
                                withDiscussion={true}
                                withAttachments={true}
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
