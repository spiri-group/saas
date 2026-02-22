'use client';

import React, { useState } from 'react';
import { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Radio, Clock, Users, DollarSign, ArrowRight } from 'lucide-react';
import { useLiveSessions, LiveSessionData } from './_hooks/UseLiveSessions';
import { useTierFeatures } from '@/hooks/UseTierFeatures';
import StartLiveSessionDialog from '@/components/live-assist/StartLiveSessionDialog';
import Link from 'next/link';

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
};

function formatAmount(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDuration(start: string, end?: string | null): string {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
}

function SessionStatusBadge({ sessionStatus }: { sessionStatus: string }) {
    switch (sessionStatus) {
        case 'ACTIVE':
            return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Live</Badge>;
        case 'PAUSED':
            return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Paused</Badge>;
        case 'ENDED':
            return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Ended</Badge>;
        default:
            return null;
    }
}

export default function LiveAssistUI({ session, practitionerId, slug }: Props) {
    const { features } = useTierFeatures(practitionerId);
    const { data: sessions, isLoading } = useLiveSessions(practitionerId);
    const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);

    const vendor = session.user.vendors?.find(v => v.id === practitionerId);
    const vendorCurrency = vendor?.currency || 'AUD';

    // Feature gate
    if (!features.hasLiveAssist) {
        return (
            <div className="p-6 max-w-3xl" data-testid="live-assist-upgrade">
                <div className="text-center py-16">
                    <Radio className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Live Assist</h2>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                        Collect reading requests and payments during your livestreams on TikTok, Instagram, and more.
                    </p>
                    <Link href={`/p/${slug}/manage/subscription`}>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="upgrade-btn">
                            Upgrade to Illuminate
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const activeSessions = sessions?.filter(s => s.sessionStatus === 'ACTIVE' || s.sessionStatus === 'PAUSED') || [];
    const pastSessions = sessions?.filter(s => s.sessionStatus === 'ENDED') || [];

    return (
        <div className="p-6 max-w-5xl" data-testid="live-assist-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Live Assist</h1>
                    <p className="text-sm text-slate-400 mt-1">Manage your live reading sessions</p>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={activeSessions.length > 0 ? 0 : undefined}>
                                <Button
                                    onClick={() => setShowGoLiveDialog(true)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    disabled={activeSessions.length > 0}
                                    data-testid="go-live-btn"
                                >
                                    <Radio className="h-4 w-4 mr-2" />
                                    Go Live
                                </Button>
                            </span>
                        </TooltipTrigger>
                        {activeSessions.length > 0 && (
                            <TooltipContent>
                                <p>You already have an active session</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Active Session Banner */}
            {activeSessions.map((s) => (
                <Link key={s.id} href={`/p/${slug}/manage/live-assist/session/${s.id}`}>
                    <Card className="mb-6 bg-red-500/10 border-red-500/30 hover:bg-red-500/15 cursor-pointer transition-colors" data-testid="active-session-card">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Radio className="h-5 w-5 text-red-500 animate-pulse" />
                                    <div>
                                        <p className="font-medium text-white">
                                            {s.sessionTitle || 'Live Session'}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            {s.totalJoined} joined &middot; {s.totalCompleted} completed &middot; {formatAmount(s.totalRevenue)} revenue
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <SessionStatusBadge sessionStatus={s.sessionStatus} />
                                    <ArrowRight className="h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}

            {/* Past Sessions */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
                </div>
            ) : pastSessions.length === 0 && activeSessions.length === 0 ? (
                <div className="text-center py-16" data-testid="no-sessions">
                    <Radio className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No sessions yet</h3>
                    <p className="text-slate-400 mb-4">Start your first live reading session!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {pastSessions.length > 0 && (
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Past Sessions</h3>
                    )}
                    {pastSessions.map((s) => (
                        <Card key={s.id} className="bg-slate-900 border-slate-700" data-testid={`session-card-${s.id}`}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-white">
                                            {s.sessionTitle || 'Live Session'}
                                        </p>
                                        <p className="text-sm text-slate-400">{formatDate(s.startedAt)}</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {formatDuration(s.startedAt, s.endedAt)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {s.totalJoined}/{s.totalCompleted}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <DollarSign className="h-3.5 w-3.5" />
                                            {formatAmount(s.totalRevenue)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <StartLiveSessionDialog
                open={showGoLiveDialog}
                onOpenChange={setShowGoLiveDialog}
                vendorId={practitionerId}
                vendorCurrency={vendorCurrency}
                practitionerSlug={slug}
            />
        </div>
    );
}
