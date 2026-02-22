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
                    onClose={() => setShowGetStarted(null)}
                    onContinue={(tier, interval) => {
                        setShowGetStarted(null);
                        if (showGetStarted === 'merchant') {
                            router.push(`/m/setup?tier=${tier}&interval=${interval}`);
                        } else {
                            router.push(`/p/setup?tier=${tier}&interval=${interval}`);
                        }
                    }}
                />
            )}
        </>
    );
};

const TIER_OUTCOMES: Record<string, string[]> = {
    awaken: [
        'Share your practice globally',
        'Book readings & sessions',
        'Showcase work in a gallery',
    ],
    illuminate: [
        'Send payment links',
        'Go live and earn in real-time',
        'Sell at expos and markets',
    ],
    manifest: [
        'Your own online storefront',
        'Manage products & orders',
        'Integrated checkout',
    ],
    transcend: [
        'Unlimited products',
        'Host practitioners',
        'Automated shipping',
    ],
};

const DIALOG_CONFIG = {
    practitioner: {
        icon: Sparkles,
        title: 'Start Your Practice',
        subtitle: 'Choose the plan that fits your practice',
        profileType: 'practitioner',
        tiers: ['awaken', 'illuminate'],
        defaultTier: 'awaken',
    },
    merchant: {
        icon: Store,
        title: 'Open Your Shop',
        subtitle: 'Choose the plan that fits your business',
        profileType: 'merchant',
        tiers: ['manifest', 'transcend'],
        defaultTier: 'manifest',
    },
} as const;

type GetStartedDialogProps = {
    type: 'merchant' | 'practitioner';
    onClose: () => void;
    onContinue: (tier: string, interval: 'monthly' | 'annual') => void;
};

const GetStartedDialog: React.FC<GetStartedDialogProps> = ({
    type,
    onClose,
    onContinue,
}) => {
    const config = DIALOG_CONFIG[type];
    const Icon = config.icon;
    const isPurple = type === 'practitioner';
    const [selectedTier, setSelectedTier] = useState<string>(config.defaultTier);
    const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
    const { data: tiers, isLoading: tiersLoading } = useSubscriptionTiers(config.profileType);

    const availableTiers = tiers?.filter(t => (config.tiers as readonly string[]).includes(t.tier)) || [];

    const selectedTierDef = availableTiers.find(t => t.tier === selectedTier);
    const price = selectedTierDef
        ? billingInterval === 'monthly'
            ? selectedTierDef.monthlyPrice
            : selectedTierDef.annualPrice
        : null;
    const currency = selectedTierDef?.currency || 'USD';

    const formatPrice = (cents: number) => {
        const amount = cents / 100;
        return amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
    };

    return (
        <Dialog open onOpenChange={() => onClose()}>
            <DialogContent data-testid="get-started-dialog" className="sm:max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-4">
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

                <div className="space-y-5">
                    {/* Billing toggle */}
                    <div
                        className="flex rounded-lg border p-1"
                        data-testid="get-started-interval-toggle"
                    >
                        <Button
                            variant="ghost"
                            data-testid="get-started-monthly-btn"
                            onClick={() => setBillingInterval('monthly')}
                            className={`flex-1 ${
                                billingInterval === 'monthly'
                                    ? isPurple ? 'bg-purple-600 text-white hover:bg-purple-600 hover:text-white' : 'bg-amber-600 text-white hover:bg-amber-600 hover:text-white'
                                    : 'text-muted-foreground'
                            }`}
                        >
                            Monthly
                        </Button>
                        <Button
                            variant="ghost"
                            data-testid="get-started-annual-btn"
                            onClick={() => setBillingInterval('annual')}
                            className={`flex-1 ${
                                billingInterval === 'annual'
                                    ? isPurple ? 'bg-purple-600 text-white hover:bg-purple-600 hover:text-white' : 'bg-amber-600 text-white hover:bg-amber-600 hover:text-white'
                                    : 'text-muted-foreground'
                            }`}
                        >
                            Annual
                        </Button>
                    </div>

                    {/* Tier cards */}
                    {tiersLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                            <LoaderIcon className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading plans...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4" data-testid="get-started-tier-cards">
                            {availableTiers.map((tier) => {
                                const isSelected = tier.tier === selectedTier;
                                const tierPrice = billingInterval === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
                                return (
                                    <Button
                                        key={tier.tier}
                                        variant="ghost"
                                        data-testid={`get-started-tier-${tier.tier}`}
                                        onClick={() => setSelectedTier(tier.tier)}
                                        className={`relative rounded-xl border-2 p-5 h-auto text-left transition-all ${
                                            isSelected
                                                ? isPurple
                                                    ? 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/10'
                                                    : 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/10'
                                                : 'border-white/10 hover:border-white/20 hover:bg-transparent'
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-baseline justify-between gap-2 flex-nowrap">
                                                <p className={`text-base font-semibold whitespace-nowrap ${
                                                    isSelected
                                                        ? isPurple ? 'text-purple-300' : 'text-amber-300'
                                                        : 'text-white/90'
                                                }`}>
                                                    {tier.name}
                                                </p>
                                                <div className="whitespace-nowrap">
                                                    <span className="text-xl font-bold">{formatPrice(tierPrice)}</span>
                                                    <span className="text-muted-foreground text-sm">
                                                        /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {(TIER_OUTCOMES[tier.tier] || []).map((outcome, i) => (
                                                    <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                                                        <span className={`inline-block mr-1.5 ${isPurple ? 'text-purple-400/70' : 'text-amber-400/70'}`}>&#x2022;</span>
                                                        {outcome}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </Button>
                                );
                            })}
                        </div>
                    )}

                    {/* Currency note */}
                    {!tiersLoading && price != null && (
                        <p className="text-[11px] text-muted-foreground/60 text-center">{currency}, taxes included</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            size="lg"
                            data-testid="get-started-cancel-btn"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Not Now
                        </Button>
                        <Button
                            size="lg"
                            data-testid="get-started-continue-btn"
                            onClick={() => onContinue(selectedTier, billingInterval)}
                            disabled={tiersLoading}
                            className={`flex-1 text-white ${
                                isPurple
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : 'bg-amber-600 hover:bg-amber-700'
                            }`}
                        >
                            Get Started
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UI;
