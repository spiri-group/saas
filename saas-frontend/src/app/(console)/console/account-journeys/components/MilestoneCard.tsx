import { MilestoneStats } from '../types';
import {
    Package,
    ShoppingCart,
    Star,
    CreditCard,
    Landmark,
    BadgeCheck,
    UserCheck,
    Sparkles,
    Heart,
    UserPlus,
} from 'lucide-react';

interface MilestoneCardProps {
    milestone: MilestoneStats;
}

const MILESTONE_ICONS: Record<string, React.ReactNode> = {
    FIRST_LISTING: <Package className="h-5 w-5" />,
    FIRST_ORDER_RECEIVED: <ShoppingCart className="h-5 w-5" />,
    FIRST_REVIEW: <Star className="h-5 w-5" />,
    STRIPE_CONNECTED: <Landmark className="h-5 w-5" />,
    FIRST_BILLING_PAYMENT: <CreditCard className="h-5 w-5" />,
    PRACTITIONER_VERIFIED: <BadgeCheck className="h-5 w-5" />,
    PROFILE_COMPLETED: <UserCheck className="h-5 w-5" />,
    FIRST_ORDER_PLACED: <ShoppingCart className="h-5 w-5" />,
    SPIRITUAL_INTERESTS_SET: <Heart className="h-5 w-5" />,
    FIRST_FOLLOW: <UserPlus className="h-5 w-5" />,
    FIRST_REVIEW_LEFT: <Star className="h-5 w-5" />,
};

const MILESTONE_COLORS: Record<string, string> = {
    FIRST_LISTING: 'text-blue-400',
    FIRST_ORDER_RECEIVED: 'text-green-400',
    FIRST_REVIEW: 'text-yellow-400',
    STRIPE_CONNECTED: 'text-cyan-400',
    FIRST_BILLING_PAYMENT: 'text-emerald-400',
    PRACTITIONER_VERIFIED: 'text-purple-400',
    PROFILE_COMPLETED: 'text-teal-400',
    FIRST_ORDER_PLACED: 'text-green-400',
    SPIRITUAL_INTERESTS_SET: 'text-pink-400',
    FIRST_FOLLOW: 'text-indigo-400',
    FIRST_REVIEW_LEFT: 'text-amber-400',
};

function getProgressBarColor(pct: number): string {
    if (pct >= 75) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-green-500';
    if (pct >= 25) return 'bg-yellow-500';
    return 'bg-orange-500';
}

export default function MilestoneCard({ milestone }: MilestoneCardProps) {
    const icon = MILESTONE_ICONS[milestone.milestoneKey] || <Sparkles className="h-5 w-5" />;
    const iconColor = MILESTONE_COLORS[milestone.milestoneKey] || 'text-slate-400';

    // Empty state: no eligible entities
    if (milestone.totalEligible === 0) {
        return (
            <div
                className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 space-y-3"
                data-testid={`milestone-card-${milestone.milestoneKey.toLowerCase()}`}
            >
                <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 ${iconColor}`}>
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white">{milestone.label}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">No data yet</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 space-y-3"
            data-testid={`milestone-card-${milestone.milestoneKey.toLowerCase()}`}
        >
            {/* Header */}
            <div className="flex items-start space-x-3">
                <div className={`mt-0.5 ${iconColor}`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-white">{milestone.label}</h4>
                        {milestone.recentCount !== null && milestone.recentCount > 0 && (
                            <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20"
                                data-testid={`milestone-recent-${milestone.milestoneKey.toLowerCase()}`}
                            >
                                {milestone.recentCount} this week
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{milestone.description}</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(milestone.achievedPercent)}`}
                        style={{ width: `${Math.max(milestone.achievedPercent, 1)}%` }}
                        data-testid={`milestone-progress-${milestone.milestoneKey.toLowerCase()}`}
                    />
                </div>
                <div className="flex items-center justify-between text-xs">
                    {milestone.achievedCount === 0 ? (
                        <span className="text-slate-500">
                            0 of {milestone.totalEligible}
                            <span className="text-slate-600 ml-1">(0%)</span>
                        </span>
                    ) : (
                        <span className="text-slate-300">
                            {milestone.achievedCount} of {milestone.totalEligible}
                            <span className="text-slate-500 ml-1">({milestone.achievedPercent}%)</span>
                        </span>
                    )}
                    {(milestone.medianDays !== null || milestone.averageDays !== null) && (
                        <span className="text-slate-400">
                            {milestone.medianDays !== null && (
                                <span>~{milestone.medianDays}d median</span>
                            )}
                            {milestone.medianDays !== null && milestone.averageDays !== null && (
                                <span className="mx-1 text-slate-600">&middot;</span>
                            )}
                            {milestone.averageDays !== null && (
                                <span>{milestone.averageDays}d avg</span>
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
