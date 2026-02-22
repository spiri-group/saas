'use client';

import React, { useState } from 'react';
import { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Store, DollarSign, ShoppingBag, ArrowRight, Plus } from 'lucide-react';
import { useExpos, ExpoData } from './_hooks/UseExpos';
import { useCreateExpo } from './_hooks/UseCreateExpo';
import { useTierFeatures } from '@/hooks/UseTierFeatures';
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
    });
}

function ExpoStatusBadge({ expoStatus }: { expoStatus: string }) {
    switch (expoStatus) {
        case 'SETUP':
            return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30" data-testid="expo-badge-setup">Setup</Badge>;
        case 'LIVE':
            return <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid="expo-badge-live">Live</Badge>;
        case 'PAUSED':
            return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30" data-testid="expo-badge-paused">Paused</Badge>;
        case 'ENDED':
            return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30" data-testid="expo-badge-ended">Ended</Badge>;
        default:
            return null;
    }
}

export default function ExpoModeUI({ session, practitionerId, slug }: Props) {
    const { features } = useTierFeatures(practitionerId);
    const { data: expos, isLoading } = useExpos(practitionerId);
    const createExpoMutation = useCreateExpo();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newExpoName, setNewExpoName] = useState('');

    // Feature gate
    if (!features.hasExpoMode) {
        return (
            <div className="p-6 max-w-3xl" data-testid="expo-mode-upgrade">
                <div className="text-center py-16">
                    <Store className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Expo Mode</h2>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                        Create a popup shop for expos, fairs, and markets. Share a QR code, take payments, and track inventory in real-time.
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

    const activeExpos = expos?.filter(e => e.expoStatus === 'SETUP' || e.expoStatus === 'LIVE' || e.expoStatus === 'PAUSED') || [];
    const pastExpos = expos?.filter(e => e.expoStatus === 'ENDED') || [];

    const handleCreate = async () => {
        if (!newExpoName.trim()) return;
        try {
            await createExpoMutation.mutateAsync({
                vendorId: practitionerId,
                expoName: newExpoName.trim(),
            });
            setShowCreateDialog(false);
            setNewExpoName('');
        } catch {
            // Error handled by mutation
        }
    };

    return (
        <div className="p-6 max-w-5xl" data-testid="expo-mode-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Expo Mode</h1>
                    <p className="text-sm text-slate-400 mt-1">Create popup shops for expos, fairs, and markets</p>
                </div>
                <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={activeExpos.length > 0}
                    data-testid="create-expo-btn"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Expo
                </Button>
            </div>

            {/* Active Expo Banner */}
            {activeExpos.map((expo) => (
                <Link key={expo.id} href={`/p/${slug}/manage/expo-mode/expo/${expo.id}`}>
                    <Card className="mb-6 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15 cursor-pointer transition-colors" data-testid="active-expo-card">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Store className="h-5 w-5 text-purple-500" />
                                    <div>
                                        <p className="font-medium text-white">{expo.expoName}</p>
                                        <p className="text-sm text-slate-400">
                                            {expo.totalSales} sales &middot; {formatAmount(expo.totalRevenue)} revenue &middot; {expo.totalItemsSold} items sold
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ExpoStatusBadge expoStatus={expo.expoStatus} />
                                    <ArrowRight className="h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}

            {/* Past Expos */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
                </div>
            ) : pastExpos.length === 0 && activeExpos.length === 0 ? (
                <div className="text-center py-16" data-testid="no-expos">
                    <Store className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No expos yet</h3>
                    <p className="text-slate-400 mb-4">Create your first expo to get started!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {pastExpos.length > 0 && (
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Past Expos</h3>
                    )}
                    {pastExpos.map((expo) => (
                        <Link key={expo.id} href={`/p/${slug}/manage/expo-mode/expo/${expo.id}`}>
                            <Card className="bg-slate-900 border-slate-700 hover:bg-slate-800/80 cursor-pointer transition-colors mb-2" data-testid={`expo-card-${expo.id}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-white">{expo.expoName}</p>
                                            <p className="text-sm text-slate-400">{formatDate(expo.createdAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <ShoppingBag className="h-3.5 w-3.5" />
                                                {expo.totalSales}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <DollarSign className="h-3.5 w-3.5" />
                                                {formatAmount(expo.totalRevenue)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Expo Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md" data-testid="create-expo-dialog">
                    <DialogHeader>
                        <DialogTitle>Create Expo</DialogTitle>
                        <DialogDescription>
                            Give your expo a name. You&apos;ll add items and go live next.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="expo-name">Expo Name</Label>
                            <Input
                                id="expo-name"
                                placeholder="e.g. MBS Expo Melbourne"
                                value={newExpoName}
                                onChange={(e) => setNewExpoName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                data-testid="expo-name-input"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setShowCreateDialog(false)}
                            data-testid="cancel-create-btn"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!newExpoName.trim() || createExpoMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            data-testid="confirm-create-btn"
                        >
                            {createExpoMutation.isPending ? 'Creating...' : 'Create Expo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
