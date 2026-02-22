'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Package, Store, Sparkles, Settings, LogOut, PencilLine, Plus, LayoutDashboard, LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import BouncingDots from "@/icons/BouncingDots";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { VendorDocType } from "@/utils/spiriverse";
import { useSubscriptionTiers } from "@/hooks/UseSubscriptionTiers";

function getInitials(email: string): string {
    const local = email.split('@')[0] ?? '';
    if (local.includes('.')) {
        const parts = local.split('.');
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
}

const UI: React.FC<{ user: { email: string; id: string } }> = ({ user: { email, id } }) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const queryClient = useQueryClient();
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [showGetStarted, setShowGetStarted] = useState<'merchant' | 'practitioner' | null>(null);
    const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
    const [menuOpen, setMenuOpen] = useState(false);

    const initials = getInitials(email);

    const handleSignOut = async () => {
        try {
            await signOut({ callbackUrl: '/' });
            queryClient.invalidateQueries({
                queryKey: ['user-me-contact', 'user-me-nav', 'setup-me'],
            });
        } catch (error) {
            console.error("Error during sign-out:", error);
        }
    };

    const merchants = session?.user?.vendors?.filter(v => v.docType === VendorDocType.MERCHANT || !v.docType) ?? [];
    const practitioners = session?.user?.vendors?.filter(v => v.docType === VendorDocType.PRACTITIONER) ?? [];

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger
                    data-testid="user-menu-trigger"
                    className="flex items-center justify-center w-9 h-9 mr-2 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    aria-label="User account menu"
                    onMouseEnter={() => setMenuOpen(true)}
                >
                    {initials}
                </DropdownMenuTrigger>
                {status === "loading" && (
                    <DropdownMenuContent className="w-72 bg-slate-950/95 backdrop-blur-xl border border-white/10">
                        <div className="flex items-center justify-center p-4">
                            <BouncingDots />
                        </div>
                    </DropdownMenuContent>
                )}
                {session?.user && (
                    <DropdownMenuContent
                        align="end"
                        data-testid="user-menu-dropdown"
                        className="w-72 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-0"
                    >
                        {/* Header card */}
                        <div data-testid="user-menu-header" className="flex items-center gap-3 px-4 py-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-semibold shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm text-white/90 truncate">{email}</p>
                                <p className="text-xs text-slate-400">Customer Account</p>
                            </div>
                        </div>

                        <DropdownMenuSeparator className="bg-white/10" />

                        {/* Customer quick links */}
                        <div className="py-1">
                            <DropdownMenuItem
                                data-testid="user-menu-space"
                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                onClick={() => router.push(`/u/${id}/space`)}
                            >
                                <Sparkles className="w-4 h-4 mr-3 text-amber-400" />
                                My Journey
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                data-testid="user-menu-orders"
                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                onClick={() => router.push(`/u/${id}/space/orders`)}
                            >
                                <Package className="w-4 h-4 mr-3 text-amber-400" />
                                Orders
                            </DropdownMenuItem>
                        </div>

                        {/* Merchants section */}
                        {merchants.length > 0 && (
                            <>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <div className="py-1">
                                    {merchants.map((vendor) => (
                                        <div key={vendor.id}>
                                            <p className="px-4 pt-2 pb-1 text-[10px] text-amber-300/50 uppercase tracking-wider font-medium">
                                                {vendor.name}
                                            </p>
                                            <DropdownMenuItem
                                                data-testid={`user-menu-merchant-${vendor.slug}`}
                                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                                onClick={() => router.push(`/m/${vendor.slug}`)}
                                            >
                                                <Store className="w-4 h-4 mr-3 text-amber-400" />
                                                Shop Page
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                data-testid={`user-menu-merchant-dashboard-${vendor.slug}`}
                                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                                onClick={() => router.push(`/m/${vendor.slug}/manage`)}
                                            >
                                                <LayoutDashboard className="w-4 h-4 mr-3 text-amber-400" />
                                                Dashboard
                                            </DropdownMenuItem>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Practitioners section */}
                        {practitioners.length > 0 && (
                            <>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <div className="py-1">
                                    {practitioners.map((practitioner) => (
                                        <div key={practitioner.id}>
                                            <p className="px-4 pt-2 pb-1 text-[10px] text-amber-300/50 uppercase tracking-wider font-medium">
                                                {practitioner.name}
                                            </p>
                                            <DropdownMenuItem
                                                data-testid={`user-menu-practitioner-${practitioner.slug}`}
                                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                                onClick={() => router.push(`/p/${practitioner.slug}`)}
                                            >
                                                <Sparkles className="w-4 h-4 mr-3 text-amber-400" />
                                                Profile Page
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                data-testid={`user-menu-practitioner-dashboard-${practitioner.slug}`}
                                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                                onClick={() => router.push(`/p/${practitioner.slug}/manage`)}
                                            >
                                                <LayoutDashboard className="w-4 h-4 mr-3 text-amber-400" />
                                                Dashboard
                                            </DropdownMenuItem>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Become CTAs */}
                        {(merchants.length === 0 || practitioners.length === 0) && (
                            <>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <div className="py-1">
                                    {merchants.length === 0 && (
                                        <DropdownMenuItem
                                            data-testid="user-menu-become-merchant"
                                            className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                            onClick={() => {
                                                if (session.user && session.user.requiresInput) {
                                                    setShowProfileDialog(true);
                                                } else {
                                                    setMenuOpen(false);
                                                    setBillingInterval('monthly');
                                                    setShowGetStarted('merchant');
                                                }
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-3 text-amber-400" />
                                            Open a Shop
                                        </DropdownMenuItem>
                                    )}
                                    {practitioners.length === 0 && (
                                        <DropdownMenuItem
                                            data-testid="user-menu-become-practitioner"
                                            className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                            onClick={() => {
                                                if (session.user && session.user.requiresInput) {
                                                    setShowProfileDialog(true);
                                                } else {
                                                    setMenuOpen(false);
                                                    setBillingInterval('monthly');
                                                    setShowGetStarted('practitioner');
                                                }
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-3 text-amber-400" />
                                            Start Practising
                                        </DropdownMenuItem>
                                    )}
                                </div>
                            </>
                        )}

                        <DropdownMenuSeparator className="bg-white/10" />

                        {/* Account Settings & Sign Out */}
                        <div className="py-1">
                            <DropdownMenuItem
                                data-testid="user-menu-settings"
                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                onClick={() => router.push(`/u/${id}/space/account`)}
                            >
                                <Settings className="w-4 h-4 mr-3 text-amber-400" />
                                Account Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                data-testid="user-menu-sign-out"
                                className="px-4 py-2 text-white/90 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                                onClick={handleSignOut}
                            >
                                <LogOut className="w-4 h-4 mr-3 text-amber-400" />
                                Sign Out
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                )}
            </DropdownMenu>

            {showProfileDialog && (
                <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                    <DialogContent className="sm:max-w-md rounded-2xl p-8 shadow-xl">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <PencilLine className="w-6 h-6 text-yellow-500" />
                                <DialogTitle className="text-xl font-bold">Complete your profile</DialogTitle>
                            </div>
                            <DialogDescription className="text-base text-gray-600 mt-2 leading-relaxed">
                                You must complete your profile before continuing. Please update your details to proceed.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex flex-row gap-2 justify-end mt-6">
                            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
                                Close
                            </Button>
                            <Button type="button" variant="default" onClick={() => {
                                if (typeof window !== "undefined" && window.location.pathname === '/setup') {
                                    window.location.reload();
                                } else {
                                    router.push('/setup');
                                }
                            }}>
                                Go to profile setup
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {showGetStarted && (
                <GetStartedDialog
                    type={showGetStarted}
                    billingInterval={billingInterval}
                    onBillingIntervalChange={setBillingInterval}
                    onClose={() => setShowGetStarted(null)}
                    onContinue={(interval) => {
                        setShowGetStarted(null);
                        if (showGetStarted === 'merchant') {
                            router.push(`/m/setup?tier=manifest&interval=${interval}`);
                        } else {
                            router.push(`/p/setup?tier=awaken&interval=${interval}`);
                        }
                    }}
                />
            )}
        </>
    );
};

const MERCHANT_CONFIG = {
    tier: 'manifest',
    tierName: 'Manifest',
    profileType: 'merchant',
    icon: Store,
    title: 'Open Your Shop',
    subtitle: 'Start selling on SpiriVerse with the Manifest plan',
    accentColor: 'amber',
    benefits: [
        'List and sell products on your own storefront',
        'Accept payments with integrated checkout',
        'Manage orders, fulfilment and inventory',
        'Customise your shop branding and appearance',
    ],
} as const;

const PRACTITIONER_CONFIG = {
    tier: 'awaken',
    tierName: 'Awaken',
    profileType: 'practitioner',
    icon: Sparkles,
    title: 'Start Your Practice',
    subtitle: 'Share your gifts with the world on the Awaken plan',
    accentColor: 'purple',
    benefits: [
        'Create your professional practitioner profile',
        'Offer readings, healings and coaching sessions',
        'Build your gallery and showcase your work',
        'Connect with seekers around the world',
    ],
} as const;

type GetStartedDialogProps = {
    type: 'merchant' | 'practitioner';
    billingInterval: 'monthly' | 'annual';
    onBillingIntervalChange: (interval: 'monthly' | 'annual') => void;
    onClose: () => void;
    onContinue: (interval: 'monthly' | 'annual') => void;
};

const GetStartedDialog: React.FC<GetStartedDialogProps> = ({
    type,
    billingInterval,
    onBillingIntervalChange,
    onClose,
    onContinue,
}) => {
    const config = type === 'merchant' ? MERCHANT_CONFIG : PRACTITIONER_CONFIG;
    const Icon = config.icon;
    const { data: tiers, isLoading: tiersLoading } = useSubscriptionTiers(config.profileType);

    const tierDef = tiers?.find(t => t.tier === config.tier);
    const price = tierDef
        ? billingInterval === 'monthly'
            ? tierDef.monthlyPrice
            : tierDef.annualPrice
        : null;
    const currency = tierDef?.currency || 'USD';

    const formatPrice = (cents: number) => {
        const amount = cents / 100;
        return amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
    };

    const isPurple = config.accentColor === 'purple';

    return (
        <Dialog open onOpenChange={() => onClose()}>
            <DialogContent data-testid="get-started-dialog" className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
                {/* Header */}
                <div className={`px-6 pt-6 pb-4 ${isPurple ? 'bg-purple-500/10' : 'bg-amber-500/10'}`}>
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className={`rounded-full p-3 ${isPurple ? 'bg-purple-500/20' : 'bg-amber-500/20'}`}>
                                <Icon className={`h-7 w-7 ${isPurple ? 'text-purple-400' : 'text-amber-400'}`} />
                            </div>
                            <div>
                                <DialogTitle data-testid="get-started-title" className="text-xl font-bold">{config.title}</DialogTitle>
                                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                                    {config.subtitle}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="px-6 pb-6 pt-4 space-y-5">
                    {/* Benefits */}
                    <div data-testid="get-started-benefits" className="space-y-2.5">
                        {config.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-sm">
                                <Sparkles className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${isPurple ? 'text-purple-400' : 'text-amber-400'}`} />
                                <span className="text-muted-foreground">{benefit}</span>
                            </div>
                        ))}
                    </div>

                    {/* Billing toggle */}
                    <div>
                        <div
                            className="flex rounded-lg border p-1"
                            data-testid="get-started-interval-toggle"
                        >
                            <button
                                type="button"
                                data-testid="get-started-monthly-btn"
                                onClick={() => onBillingIntervalChange('monthly')}
                                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    billingInterval === 'monthly'
                                        ? isPurple ? 'bg-purple-600 text-white' : 'bg-amber-600 text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                data-testid="get-started-annual-btn"
                                onClick={() => onBillingIntervalChange('annual')}
                                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    billingInterval === 'annual'
                                        ? isPurple ? 'bg-purple-600 text-white' : 'bg-amber-600 text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Annual
                            </button>
                        </div>

                        {/* Price */}
                        <div className="mt-3 text-center" data-testid="get-started-price">
                            {tiersLoading ? (
                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                    <LoaderIcon className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Loading pricing...</span>
                                </div>
                            ) : price != null ? (
                                <div>
                                    <span className="text-2xl font-bold">{formatPrice(price)}</span>
                                    <span className="text-muted-foreground text-sm">
                                        /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                                    </span>
                                    <p className="text-[11px] text-muted-foreground/60 mt-1">AUD, taxes included</p>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            data-testid="get-started-cancel-btn"
                            onClick={onClose}
                            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                        >
                            Not Now
                        </button>
                        <button
                            type="button"
                            data-testid="get-started-continue-btn"
                            onClick={() => onContinue(billingInterval)}
                            disabled={tiersLoading}
                            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                isPurple
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : 'bg-amber-600 hover:bg-amber-700'
                            }`}
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UI;
