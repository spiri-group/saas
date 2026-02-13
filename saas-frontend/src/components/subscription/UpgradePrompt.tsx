'use client';

import { ArrowUpCircle, X, Sparkles } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

type UpgradePromptProps = {
    feature: string;
    requiredTier: string;
    currentTier?: string;
    onUpgrade?: () => void;
    onClose: () => void;
};

const TIER_DISPLAY: Record<string, string> = {
    awaken: 'Awaken',
    manifest: 'Manifest',
    transcend: 'Transcend',
};

// Benefit-oriented descriptions keyed by feature text
// Falls back gracefully if no match — the feature text itself is always shown
const FEATURE_BENEFITS: Record<string, { headline: string; benefits: string[] }> = {
    'Open your shop with up to 10 products': {
        headline: 'Start selling on SpiriVerse',
        benefits: ['List up to 10 products', 'Accept payments instantly', 'Manage orders and fulfilment'],
    },
    'Host and sell guided tours': {
        headline: 'Create guided spiritual experiences',
        benefits: ['Design multi-stop tour itineraries', 'Sell tickets with built-in inventory', 'Manage bookings and check-ins'],
    },
    'Paranormal investigations with SpiriAssist': {
        headline: 'Grow your investigation practice',
        benefits: ['Browse and apply to paranormal cases', 'Submit proposals with your own pricing', 'Manage investigations end-to-end'],
    },
    'Host featured practitioners on your storefront': {
        headline: 'Build a practitioner network',
        benefits: ['Feature practitioners on your storefront', 'Cross-promote services and products', 'Attract more customers through collaborations'],
    },
    'Automate inventory tracking and alerts': {
        headline: 'Automate your inventory',
        benefits: ['Real-time stock tracking across variants', 'Low stock and out-of-stock alerts', 'Full transaction history and reporting'],
    },
    'Product limit reached': {
        headline: 'Expand your catalogue',
        benefits: ['Unlimited products on the Transcend plan', 'No restrictions on variants or categories', 'Scale your store without limits'],
    },
};

function getFeatureBenefits(feature: string) {
    // Try exact match first, then partial match
    if (FEATURE_BENEFITS[feature]) return FEATURE_BENEFITS[feature];
    for (const [key, value] of Object.entries(FEATURE_BENEFITS)) {
        if (feature.toLowerCase().includes(key.toLowerCase().slice(0, 20))) return value;
    }
    return null;
}

export default function UpgradePrompt({
    feature,
    requiredTier,
    currentTier,
    onUpgrade,
    onClose,
}: UpgradePromptProps) {
    const router = useRouter();
    const pathname = usePathname();
    const benefits = getFeatureBenefits(feature);

    const handleUpgrade = () => {
        if (onUpgrade) {
            onUpgrade();
        } else {
            const match = pathname.match(/^\/m\/([^/]+)/);
            if (match) {
                router.push(`/m/${match[1]}/manage/subscription`);
            }
        }
        onClose();
    };

    return (
        <div
            data-testid="upgrade-prompt-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                data-testid="upgrade-prompt-modal"
                className="relative mx-4 max-w-md w-full rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"
            >
                <button
                    type="button"
                    data-testid="upgrade-prompt-close"
                    onClick={onClose}
                    className="absolute right-4 top-4 text-slate-400 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-full bg-purple-500/20 p-3">
                        <ArrowUpCircle className="h-8 w-8 text-purple-400" />
                    </div>
                    <div>
                        <h2 data-testid="upgrade-prompt-title" className="text-xl font-bold text-white">
                            {benefits?.headline || 'Unlock This Feature'}
                        </h2>
                        {currentTier && (
                            <p className="text-sm text-slate-400">
                                Current plan: {TIER_DISPLAY[currentTier] || currentTier}
                            </p>
                        )}
                    </div>
                </div>

                {benefits ? (
                    <div className="mb-6 space-y-2.5" data-testid="upgrade-prompt-benefits">
                        {benefits.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-center gap-2.5 text-sm">
                                <Sparkles className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                                <span className="text-slate-300">{benefit}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p data-testid="upgrade-prompt-message" className="mb-6 text-slate-300">
                        <span className="font-medium text-white">{feature}</span> requires the{' '}
                        <span className="font-semibold text-purple-400">
                            {TIER_DISPLAY[requiredTier] || requiredTier}
                        </span>{' '}
                        plan or higher.
                    </p>
                )}

                <p className="mb-5 text-xs text-slate-500">
                    Available on the{' '}
                    <span className="text-purple-400 font-medium">{TIER_DISPLAY[requiredTier] || requiredTier}</span>{' '}
                    plan and above.
                </p>

                <div className="flex gap-3">
                    <button
                        type="button"
                        data-testid="upgrade-prompt-cancel"
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
                    >
                        Not Now
                    </button>
                    <button
                        type="button"
                        data-testid="upgrade-prompt-upgrade"
                        onClick={handleUpgrade}
                        className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                    >
                        Upgrade to {TIER_DISPLAY[requiredTier] || requiredTier}
                    </button>
                </div>
            </div>
        </div>
    );
}
