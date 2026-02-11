'use client';

import { useState, ReactNode } from 'react';
import { Lock } from 'lucide-react';
import UpgradePrompt from './UpgradePrompt';

type FeatureGateProps = {
    allowed: boolean;
    feature: string;
    requiredTier: string;
    currentTier?: string;
    onUpgrade?: () => void;
    children: ReactNode;
    /** Show a lock overlay instead of hiding children entirely */
    showLocked?: boolean;
};

export default function FeatureGate({
    allowed,
    feature,
    requiredTier,
    currentTier,
    onUpgrade,
    children,
    showLocked = true,
}: FeatureGateProps) {
    const [showPrompt, setShowPrompt] = useState(false);

    if (allowed) {
        return <>{children}</>;
    }

    if (!showLocked) {
        return null;
    }

    return (
        <>
            <div
                data-testid={`feature-gate-${feature.toLowerCase().replace(/\s+/g, '-')}`}
                className="relative cursor-pointer"
                onClick={() => setShowPrompt(true)}
            >
                <div className="pointer-events-none opacity-40">
                    {children}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-slate-800/90 px-4 py-2 text-sm font-medium text-slate-300 shadow-lg">
                        <Lock className="h-4 w-4" />
                        <span>Requires {requiredTier}</span>
                    </div>
                </div>
            </div>

            {showPrompt && (
                <UpgradePrompt
                    feature={feature}
                    requiredTier={requiredTier}
                    currentTier={currentTier}
                    onUpgrade={onUpgrade}
                    onClose={() => setShowPrompt(false)}
                />
            )}
        </>
    );
}
