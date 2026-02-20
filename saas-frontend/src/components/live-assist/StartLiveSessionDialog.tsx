'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Radio, Copy, Check, Zap } from 'lucide-react';
import { useStartLiveSession } from '@/app/(site)/p/[practitioner_slug]/(manage)/manage/live-assist/_hooks/UseStartLiveSession';
import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { useRouter } from 'next/navigation';
import PageQRCode from '@/components/ux/PageQRCode';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendorId: string;
    vendorCurrency: string;
    practitionerSlug: string;
};

const STORAGE_KEY_PREFIX = 'live-assist-last-';

type SavedPreset = {
    pricingMode: 'CUSTOM' | 'SERVICE';
    customAmount: string;
    serviceId: string;
    ctaMessage: string;
    ctaServiceId: string;
};

function loadLastPreset(vendorId: string): SavedPreset | null {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${vendorId}`);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
}

function savePreset(vendorId: string, preset: SavedPreset) {
    try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${vendorId}`, JSON.stringify(preset));
    } catch { /* ignore */ }
}

export default function StartLiveSessionDialog({ open, onOpenChange, vendorId, vendorCurrency, practitionerSlug }: Props) {
    const [sessionTitle, setSessionTitle] = useState('');
    const [pricingMode, setPricingMode] = useState<'CUSTOM' | 'SERVICE'>('CUSTOM');
    const [customAmount, setCustomAmount] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [hasPreset, setHasPreset] = useState(false);
    const [ctaMessage, setCtaMessage] = useState('');
    const [ctaServiceId, setCtaServiceId] = useState('');

    const startMutation = useStartLiveSession();
    const router = useRouter();

    // Fetch practitioner's services for the dropdown
    const { data: services } = useQuery({
        queryKey: ['practitioner-services', vendorId],
        queryFn: async () => {
            const response = await gql<{
                services: { id: string; name: string; ratePerHour: { amount: number; currency: string } | null }[];
            }>(`
                query Services($merchantId: ID!) {
                    services(merchantId: $merchantId) {
                        id
                        name
                        ratePerHour {
                            amount
                            currency
                        }
                    }
                }
            `, { merchantId: vendorId });
            return response.services || [];
        },
        enabled: open && !!vendorId,
    });

    // Load last used settings when dialog opens
    useEffect(() => {
        if (open) {
            const preset = loadLastPreset(vendorId);
            setSessionTitle('');
            setPricingMode(preset?.pricingMode || 'CUSTOM');
            setCustomAmount(preset?.customAmount || '');
            setServiceId(preset?.serviceId || '');
            setCtaMessage(preset?.ctaMessage || '');
            setCtaServiceId(preset?.ctaServiceId || '');
            setShareUrl(null);
            setSessionId(null);
            setCopied(false);
            setHasPreset(!!preset);
        }
    }, [open, vendorId]);

    const handleStart = useCallback(async () => {
        const input: any = {
            vendorId,
            sessionTitle: sessionTitle.trim() || undefined,
            pricingMode,
        };

        if (pricingMode === 'CUSTOM') {
            const cents = Math.round(parseFloat(customAmount) * 100);
            if (isNaN(cents) || cents <= 0) return;
            input.customPrice = { amount: cents, currency: vendorCurrency };
        } else {
            if (!serviceId) return;
            input.serviceId = serviceId;
        }

        // Add default CTA if set
        if (ctaMessage.trim()) {
            input.defaultCta = {
                message: ctaMessage.trim(),
                ...(ctaServiceId ? { recommendedServiceId: ctaServiceId } : {}),
            };
        }

        // Save these settings for next time
        savePreset(vendorId, { pricingMode, customAmount, serviceId, ctaMessage, ctaServiceId });

        const result = await startMutation.mutateAsync(input);
        if (result.success && result.shareUrl) {
            setShareUrl(result.shareUrl);
            setSessionId(result.session?.id || null);
            // Auto-copy URL to clipboard
            try {
                await navigator.clipboard.writeText(result.shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
            } catch { /* clipboard may fail in some contexts */ }
        }
    }, [vendorId, sessionTitle, pricingMode, customAmount, serviceId, vendorCurrency, startMutation]);

    const handleCopy = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleGoToDashboard = () => {
        onOpenChange(false);
        if (sessionId) {
            router.push(`/p/${practitionerSlug}/manage/live-assist/session/${sessionId}`);
        }
    };

    const selectedService = services?.find(s => s.id === serviceId);

    // Quick start: valid preset loaded and ready to go
    const canQuickStart = hasPreset && (
        (pricingMode === 'CUSTOM' && customAmount && parseFloat(customAmount) > 0) ||
        (pricingMode === 'SERVICE' && serviceId)
    );

    // Summary text for the quick-start hint
    const presetSummary = pricingMode === 'CUSTOM' && customAmount
        ? `$${parseFloat(customAmount).toFixed(2)} per reading`
        : pricingMode === 'SERVICE' && selectedService
            ? selectedService.name
            : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" data-testid="start-live-session-dialog">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Radio className="h-5 w-5 text-red-500" />
                        Go Live
                    </DialogTitle>
                    <DialogDescription>
                        Start a live reading session. Share the link with your audience.
                    </DialogDescription>
                </DialogHeader>

                {!shareUrl ? (
                    <div className="space-y-4">
                        {/* Quick Start banner when they have saved settings */}
                        {canQuickStart && presetSummary && (
                            <button
                                onClick={handleStart}
                                disabled={startMutation.isPending}
                                className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors text-left"
                                data-testid="quick-start-btn"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white flex items-center gap-1.5">
                                            <Zap className="h-3.5 w-3.5 text-amber-400" />
                                            Quick Start
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Same as last time &middot; {presetSummary}
                                        </p>
                                    </div>
                                    {startMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                                    ) : (
                                        <Radio className="h-4 w-4 text-red-400" />
                                    )}
                                </div>
                            </button>
                        )}

                        {canQuickStart && (
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-700" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-slate-900 px-2 text-slate-500">or customize</span>
                                </div>
                            </div>
                        )}

                        {/* Session Title */}
                        <div className="space-y-2">
                            <Label htmlFor="session-title">Session Title (optional)</Label>
                            <Input
                                id="session-title"
                                data-testid="session-title-input"
                                value={sessionTitle}
                                onChange={(e) => setSessionTitle(e.target.value)}
                                placeholder="Live Reading Session"
                                className="bg-slate-800 border-slate-600"
                            />
                        </div>

                        {/* Pricing Mode */}
                        <div className="space-y-3">
                            <Label>Pricing</Label>
                            <RadioGroup
                                value={pricingMode}
                                onValueChange={(v) => setPricingMode(v as 'CUSTOM' | 'SERVICE')}
                                className="space-y-2"
                            >
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="CUSTOM" id="pricing-custom" data-testid="pricing-custom" />
                                    <Label htmlFor="pricing-custom" className="font-normal cursor-pointer">Custom Price</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="SERVICE" id="pricing-service" data-testid="pricing-service" />
                                    <Label htmlFor="pricing-service" className="font-normal cursor-pointer">Link to Service</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Custom Price Input */}
                        {pricingMode === 'CUSTOM' && (
                            <div className="space-y-2">
                                <Label htmlFor="custom-amount">Amount ({vendorCurrency})</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <Input
                                        id="custom-amount"
                                        data-testid="custom-amount-input"
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        placeholder="50.00"
                                        className="bg-slate-800 border-slate-600 pl-7"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Service Selector */}
                        {pricingMode === 'SERVICE' && (
                            <div className="space-y-2">
                                <Label>Select Service</Label>
                                <Select value={serviceId} onValueChange={setServiceId}>
                                    <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="service-select">
                                        <SelectValue placeholder="Choose a service..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {services?.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name} {s.ratePerHour ? `($${(s.ratePerHour.amount / 100).toFixed(2)})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedService?.ratePerHour && (
                                    <p className="text-sm text-slate-400">
                                        Price: ${(selectedService.ratePerHour.amount / 100).toFixed(2)} {selectedService.ratePerHour.currency}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Default CTA */}
                        <div className="space-y-2 pt-2 border-t border-slate-700">
                            <Label className="text-xs text-slate-400">Default follow-up message (optional)</Label>
                            <Textarea
                                value={ctaMessage}
                                onChange={(e) => setCtaMessage(e.target.value)}
                                placeholder="Book a deeper 1:1 session with me"
                                className="bg-slate-800 border-slate-600 text-sm min-h-[48px]"
                                data-testid="cta-message-input"
                            />
                            {ctaMessage.trim() && (
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Link to service (optional)</Label>
                                    <Select value={ctaServiceId || 'none'} onValueChange={(v) => setCtaServiceId(v === 'none' ? '' : v)}>
                                        <SelectTrigger className="bg-slate-800 border-slate-600 text-sm" data-testid="cta-service-select">
                                            <SelectValue placeholder="No service link" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No service link</SelectItem>
                                            {services?.map(s => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <p className="text-xs text-slate-500">
                                This message will be pre-filled after each reading. You can customize it per person.
                            </p>
                        </div>

                        <Button
                            onClick={handleStart}
                            disabled={
                                startMutation.isPending ||
                                (pricingMode === 'CUSTOM' && (!customAmount || parseFloat(customAmount) <= 0)) ||
                                (pricingMode === 'SERVICE' && !serviceId)
                            }
                            className="w-full bg-red-600 hover:bg-red-700 text-white"
                            data-testid="go-live-btn"
                        >
                            {startMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Radio className="h-4 w-4 mr-2" />
                                    Go Live
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                            <p className="text-green-400 font-medium mb-2">You&apos;re Live!</p>
                            <p className="text-sm text-slate-400">
                                {copied
                                    ? 'Link copied to clipboard! Paste it in your stream.'
                                    : 'Share this link with your audience:'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Input
                                value={shareUrl}
                                readOnly
                                className="bg-slate-800 border-slate-600 text-white font-mono text-sm"
                                data-testid="share-url"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleCopy}
                            className="w-full"
                            data-testid="copy-link-btn"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 mr-2 text-green-400" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Link
                                </>
                            )}
                        </Button>

                        {/* QR code for streaming - show on screen */}
                        <div className="flex justify-center py-2">
                            <PageQRCode
                                url={shareUrl}
                                size={160}
                                dotColor="#7c3aed"
                                cornerColor="#7c3aed"
                                cornerDotColor="#7c3aed"
                                label="Show this QR on your stream"
                            />
                        </div>

                        <Button
                            onClick={handleGoToDashboard}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            data-testid="go-to-dashboard-btn"
                        >
                            Open Queue Dashboard
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
