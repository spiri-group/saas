'use client';

import { ArrowUpCircle, X } from 'lucide-react';

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

export default function UpgradePrompt({
    feature,
    requiredTier,
    currentTier,
    onUpgrade,
    onClose,
}: UpgradePromptProps) {
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
                className="relative mx-4 max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"
            >
                <button
                    type="button"
                    data-testid="upgrade-prompt-close"
                    onClick={onClose}
                    className="absolute right-4 top-4 text-slate-400 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-full bg-purple-500/20 p-3">
                        <ArrowUpCircle className="h-8 w-8 text-purple-400" />
                    </div>
                    <div>
                        <h2 data-testid="upgrade-prompt-title" className="text-xl font-bold text-white">
                            Upgrade Required
                        </h2>
                        {currentTier && (
                            <p className="text-sm text-slate-400">
                                Current plan: {TIER_DISPLAY[currentTier] || currentTier}
                            </p>
                        )}
                    </div>
                </div>

                <p data-testid="upgrade-prompt-message" className="mb-6 text-slate-300">
                    <span className="font-medium text-white">{feature}</span> requires the{' '}
                    <span className="font-semibold text-purple-400">
                        {TIER_DISPLAY[requiredTier] || requiredTier}
                    </span>{' '}
                    plan or higher.
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
                    {onUpgrade && (
                        <button
                            type="button"
                            data-testid="upgrade-prompt-upgrade"
                            onClick={onUpgrade}
                            className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700"
                        >
                            Upgrade to {TIER_DISPLAY[requiredTier] || requiredTier}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
