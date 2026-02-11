export interface FunnelStageDetail {
    stage: string;
    count: number;
    merchantCount: number;
    practitionerCount: number;
    percentOfTotal: number;
    medianDaysToReach: number | null;
    averageDaysToReach: number | null;
}

export interface FunnelConversion {
    fromStage: string;
    toStage: string;
    conversionRate: number;
    fromCount: number;
    toCount: number;
}

export interface VendorFunnelAnalysis {
    stages: FunnelStageDetail[];
    problemStates: FunnelStageDetail[];
    conversions: FunnelConversion[];
    totalVendors: number;
    totalMerchants: number;
    totalPractitioners: number;
}

export interface MilestoneStats {
    milestoneKey: string;
    label: string;
    description: string;
    achievedCount: number;
    totalEligible: number;
    achievedPercent: number;
    medianDays: number | null;
    averageDays: number | null;
    recentCount: number | null;
}

export interface ConsoleAccountJourneys {
    vendorFunnel: VendorFunnelAnalysis;
    vendorMilestones: MilestoneStats[];
    customerMilestones: MilestoneStats[];
    totalCustomers: number;
}

export type JourneySubTab = 'activation-funnel' | 'vendor-milestones' | 'customer-milestones';

export const STAGE_LABELS: Record<string, string> = {
    CREATED: 'Created',
    STRIPE_ONBOARDING: 'Stripe Onboarding',
    FIRST_PAYOUT: 'First Payout',
    CARD_ADDED: 'Card Added',
    PUBLISHED: 'Published',
    BILLING_ACTIVE: 'Billing Active',
    BILLING_FAILED: 'Billing Failed',
    BILLING_BLOCKED: 'Billing Blocked',
};

export const STAGE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
    CREATED: { bg: 'bg-slate-500', text: 'text-slate-400', bar: 'bg-slate-500' },
    STRIPE_ONBOARDING: { bg: 'bg-blue-500', text: 'text-blue-400', bar: 'bg-blue-500' },
    FIRST_PAYOUT: { bg: 'bg-cyan-500', text: 'text-cyan-400', bar: 'bg-cyan-500' },
    CARD_ADDED: { bg: 'bg-teal-500', text: 'text-teal-400', bar: 'bg-teal-500' },
    PUBLISHED: { bg: 'bg-green-500', text: 'text-green-400', bar: 'bg-green-500' },
    BILLING_ACTIVE: { bg: 'bg-emerald-500', text: 'text-emerald-400', bar: 'bg-emerald-500' },
    BILLING_FAILED: { bg: 'bg-orange-500', text: 'text-orange-400', bar: 'bg-orange-500' },
    BILLING_BLOCKED: { bg: 'bg-red-500', text: 'text-red-400', bar: 'bg-red-500' },
};
