'use client';

import { signOut } from 'next-auth/react';
import { ExternalLink, LogOut, Monitor, Rocket, CheckCircle2, Circle, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SpiriLogo from '@/icons/spiri-logo';
import useGoLiveReadiness from '@/app/(site)/m/_hooks/UseGoLiveReadiness';
import UseStripeMerchantAccount from '@/app/(site)/m/_hooks/UseStripeMerchantAccount';
import useInterfaceSize from '@/components/ux/useInterfaceSize';

type Props = {
    vendorId: string;
    vendorSlug: string;
    vendorType: 'practitioner' | 'merchant';
    children: React.ReactNode;
};

export default function MobileDashboardGate({ vendorId, vendorSlug, vendorType, children }: Props) {
    const { isMobile } = useInterfaceSize();

    // On desktop/tablet, render the full dashboard
    if (!isMobile) return <>{children}</>;

    return (
        <MobileView
            vendorId={vendorId}
            vendorSlug={vendorSlug}
            vendorType={vendorType}
        />
    );
}

function MobileView({ vendorId, vendorSlug, vendorType }: Omit<Props, 'children'>) {
    const { data: readiness, isLoading } = useGoLiveReadiness(vendorId);
    const returnUrl = typeof window !== 'undefined' ? window.location.href : '';
    const { data: stripeAccount } = UseStripeMerchantAccount(vendorId, undefined, returnUrl);

    const profilePath = vendorType === 'practitioner' ? `/p/${vendorSlug}` : `/m/${vendorSlug}`;
    const isPublished = readiness?.isPublished;
    const goLive = readiness?.goLiveReadiness;

    const stripeLink = stripeAccount?.update_link?.url || stripeAccount?.onboarding_link?.url;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col px-5 py-8">
            {/* Header */}
            <div className="flex items-center justify-center mb-8">
                <SpiriLogo height={36} />
            </div>

            <div className="flex-1 flex flex-col gap-5">
                {/* Go-live checklist (if not yet published) */}
                {!isPublished && goLive && !goLive.isReady && (
                    <div className="rounded-2xl border border-orange-500/30 bg-slate-800/50 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Rocket className="w-5 h-5 text-orange-400" />
                            <h2 className="text-base font-semibold text-white">Go Live Checklist</h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                            Complete these steps so customers can find you.
                        </p>
                        <div className="space-y-2">
                            {/* Banking setup */}
                            <GoLiveItem
                                label="Complete banking setup"
                                completed={!!goLive.hasStripeOnboarding}
                                href={!goLive.hasStripeOnboarding ? stripeLink : undefined}
                            />
                            {/* Payment card (if they skipped during onboarding) */}
                            {!goLive.hasPaymentCard && (
                                <GoLiveItem
                                    label="Add a payment card"
                                    completed={false}
                                    hint="Available on desktop"
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Published success */}
                {(isPublished || goLive?.isReady) && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-900/20 p-5">
                        <div className="flex items-center gap-3">
                            <PartyPopper className="w-6 h-6 text-emerald-400" />
                            <div>
                                <p className="text-emerald-300 font-medium">You&apos;re all set!</p>
                                <p className="text-emerald-400/70 text-sm">Customers can now find you on SpiriVerse.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* View public profile */}
                <a
                    href={profilePath}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-800/50 p-5 hover:bg-slate-800 transition-colors"
                >
                    <div>
                        <p className="text-white font-medium">View your public page</p>
                        <p className="text-xs text-slate-400 mt-0.5">See what customers see</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-slate-400" />
                </a>

                {/* Desktop prompt */}
                <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-5">
                    <div className="flex items-start gap-3">
                        <Monitor className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-white font-medium">Manage your dashboard</p>
                            <p className="text-sm text-slate-400 mt-1">
                                Open SpiriVerse on a desktop or tablet to manage services, bookings, products, and settings.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Log out */}
            <div className="mt-8 flex justify-center">
                <Button
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                    onClick={() => signOut({ callbackUrl: '/' })}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                </Button>
            </div>
        </div>
    );
}

function GoLiveItem({ label, completed, href, hint }: {
    label: string;
    completed: boolean;
    href?: string;
    hint?: string;
}) {
    const Icon = completed ? CheckCircle2 : Circle;
    const content = (
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            completed
                ? 'text-emerald-400'
                : href
                    ? 'text-slate-300 hover:bg-slate-700/50'
                    : 'text-slate-300'
        }`}>
            <Icon className={`w-5 h-5 flex-shrink-0 ${completed ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className={completed ? 'line-through text-slate-500' : ''}>{label}</span>
            {hint && !completed && (
                <span className="ml-auto text-xs text-slate-500">{hint}</span>
            )}
        </div>
    );

    if (href && !completed) {
        return <a href={href}>{content}</a>;
    }
    return content;
}
