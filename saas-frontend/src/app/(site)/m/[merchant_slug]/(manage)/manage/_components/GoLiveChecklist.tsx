'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, CreditCard, Landmark, Rocket, PartyPopper } from "lucide-react";
import useGoLiveReadiness from "@/app/(site)/m/_hooks/UseGoLiveReadiness";

interface GoLiveChecklistProps {
    merchantId: string;
}

const openNavDialog = (path: string[], dialogId: string) => {
    const event = new CustomEvent("open-nav-external", {
        detail: {
            path: path,
            action: {
                type: "dialog",
                dialog: dialogId
            }
        }
    });
    window.dispatchEvent(event);
};

type ChecklistItemProps = {
    label: string;
    completed: boolean;
    onClick?: () => void;
    testId: string;
};

const ChecklistItem: React.FC<ChecklistItemProps> = ({ label, completed, onClick, testId }) => {
    const Icon = completed ? CheckCircle2 : Circle;
    return (
        <button
            onClick={onClick}
            disabled={completed || !onClick}
            className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                completed
                    ? 'text-emerald-400 cursor-default'
                    : onClick
                        ? 'text-slate-300 hover:bg-slate-700/50 cursor-pointer'
                        : 'text-slate-300 cursor-default'
            }`}
            data-testid={testId}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 ${completed ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className={completed ? 'line-through text-slate-500' : ''}>{label}</span>
        </button>
    );
};

const GoLiveChecklist: React.FC<GoLiveChecklistProps> = ({ merchantId }) => {
    const { data, isLoading } = useGoLiveReadiness(merchantId);

    if (isLoading || !data) return null;

    // Don't show checklist if already published
    if (data.isPublished) return null;

    const { goLiveReadiness } = data;

    if (goLiveReadiness.isReady) {
        return (
            <Card className="bg-emerald-900/20 border-emerald-500/30 mb-6" data-testid="go-live-success">
                <CardContent className="flex items-center gap-3 py-4">
                    <PartyPopper className="w-6 h-6 text-emerald-400" />
                    <div>
                        <p className="text-emerald-300 font-medium">Your shop is live!</p>
                        <p className="text-emerald-400/70 text-sm">Customers can now find and visit your shop.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const completedCount = [
        goLiveReadiness.hasStripeOnboarding,
        goLiveReadiness.hasPaymentCard,
        goLiveReadiness.hasFirstPayment,
    ].filter(Boolean).length;

    return (
        <Card className="bg-slate-800/50 border-orange-500/30 mb-6" data-testid="go-live-checklist">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-orange-400" />
                        <CardTitle className="text-base text-white">Go Live Checklist</CardTitle>
                    </div>
                    <span className="text-xs text-slate-400">{completedCount}/3 complete</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                    Complete these steps to publish your shop and start accepting customers.
                </p>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-0.5">
                    <ChecklistItem
                        label="Complete banking setup"
                        completed={goLiveReadiness.hasStripeOnboarding}
                        onClick={!goLiveReadiness.hasStripeOnboarding
                            ? () => openNavDialog(["Setup", "Bank"], "Bank Accounts")
                            : undefined}
                        testId="go-live-banking"
                    />
                    <ChecklistItem
                        label="Add a payment card"
                        completed={goLiveReadiness.hasPaymentCard}
                        onClick={!goLiveReadiness.hasPaymentCard
                            ? () => openNavDialog(["Setup", "Cards"], "Payment Cards")
                            : undefined}
                        testId="go-live-card"
                    />
                    <ChecklistItem
                        label="Pay first month subscription"
                        completed={goLiveReadiness.hasFirstPayment}
                        onClick={!goLiveReadiness.hasFirstPayment && goLiveReadiness.hasPaymentCard
                            ? () => openNavDialog(["Setup", "Cards"], "Payment Cards")
                            : undefined}
                        testId="go-live-payment"
                    />
                </div>
            </CardContent>
        </Card>
    );
};

export default GoLiveChecklist;
