'use client'

import React, { useState } from "react";
import { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, MessageCircle, Receipt, Radio } from "lucide-react";
import UIContainer from "@/components/uicontainer";
import PractitionerSideNav from "../../../_components/PractitionerSideNav";
import WelcomeHeader from "./_components/WelcomeHeader";
import StatsCards from "./_components/StatsCards";
import NeedsAttention from "./_components/NeedsAttention";
import RecentBookings from "./_components/RecentBookings";
import GettingStarted from "./_components/GettingStarted";
import { usePractitionerDashboardData } from "./_hooks/usePractitionerDashboardData";
import { useTierFeatures } from "@/hooks/UseTierFeatures";
import CreatePaymentLinkDialog from "@/components/payment-links/CreatePaymentLinkDialog";
import StartLiveSessionDialog from "@/components/live-assist/StartLiveSessionDialog";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
    practitionerName: string;
}

const QuickAction: React.FC<{
    label: string;
    icon: React.ReactNode;
    dialogId: string;
}> = ({ label, icon, dialogId }) => {
    const handleClick = () => {
        const event = new CustomEvent("open-nav-external", {
            detail: {
                path: [label],
                action: {
                    type: "dialog",
                    dialog: dialogId
                }
            }
        });
        window.dispatchEvent(event);
    };

    return (
        <Button
            variant="outline"
            className="flex items-center gap-2 bg-slate-800/50 border-slate-700 text-white hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-300"
            onClick={handleClick}
            data-testid={`quick-action-${dialogId.toLowerCase().replace(' ', '-')}`}
        >
            {icon}
            {label}
        </Button>
    );
};

export default function PractitionerDashboard({ session, practitionerId, slug, practitionerName }: Props) {
    const data = usePractitionerDashboardData(practitionerId, slug);
    const { features } = useTierFeatures(practitionerId);
    const [showPaymentLinkDialog, setShowPaymentLinkDialog] = useState(false);
    const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);

    const vendors = session.user.vendors
        ?.filter(v => v.id)
        .map(v => ({ id: v.id, name: v.name, currency: v.currency })) || [];

    return (
        <UIContainer me={session.user}>
            <div className="flex min-h-full">
                <PractitionerSideNav
                    session={session}
                    practitionerId={practitionerId}
                    practitionerSlug={slug}
                />

                <div className="flex-1 md:ml-[200px] p-4 md:p-6 overflow-auto">
                    <div className="w-full">
                        <WelcomeHeader practitionerName={practitionerName} />

                        {/* Getting Started - conditional on onboarding state */}
                        <GettingStarted
                            slug={slug}
                            isOnboarded={data.onboarding.isOnboarded}
                            hasServices={data.onboarding.hasServices}
                            hasSchedule={data.onboarding.hasSchedule}
                        />

                        {/* Quick Actions */}
                        <div className="mb-6">
                            <div className="flex flex-wrap gap-3">
                                <QuickAction
                                    label="New Reading"
                                    icon={<Sparkles className="w-4 h-4" />}
                                    dialogId="Create Reading"
                                />
                                <QuickAction
                                    label="New Healing"
                                    icon={<Heart className="w-4 h-4" />}
                                    dialogId="Create Healing"
                                />
                                <QuickAction
                                    label="New Coaching"
                                    icon={<MessageCircle className="w-4 h-4" />}
                                    dialogId="Create Coaching"
                                />
                                {features.hasPaymentLinks && (
                                    <Button
                                        variant="outline"
                                        className="flex items-center gap-2 bg-slate-800/50 border-slate-700 text-white hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-300"
                                        onClick={() => setShowPaymentLinkDialog(true)}
                                        data-testid="quick-action-payment-link"
                                    >
                                        <Receipt className="w-4 h-4" />
                                        Payment Link
                                    </Button>
                                )}
                                {features.hasLiveAssist && (
                                    <Button
                                        variant="outline"
                                        className="flex items-center gap-2 bg-slate-800/50 border-red-500/30 text-white hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300"
                                        onClick={() => setShowGoLiveDialog(true)}
                                        data-testid="quick-action-go-live"
                                    >
                                        <Radio className="w-4 h-4" />
                                        Go Live
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Stats + Attention Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                            <div className="lg:col-span-3">
                                <StatsCards
                                    slug={slug}
                                    upcomingCount={data.stats.upcomingCount}
                                    pendingBookingsCount={data.stats.pendingBookingsCount}
                                    inProgressOrdersCount={data.stats.inProgressOrdersCount}
                                    newOrdersCount={data.stats.newOrdersCount}
                                    testimonialsCount={data.stats.testimonialsCount}
                                    avgRating={data.stats.avgRating}
                                    isLoading={data.isLoading}
                                />
                            </div>

                            <NeedsAttention
                                items={data.attentionItems}
                                isLoading={data.pendingBookings.isLoading || data.serviceOrders.isLoading || data.pendingFeaturingRequests.isLoading}
                            />
                        </div>

                        {/* Recent Bookings - full width */}
                        <RecentBookings
                            bookings={data.upcomingBookings.data || []}
                            slug={slug}
                            isLoading={data.upcomingBookings.isLoading}
                        />
                    </div>
                </div>
            </div>

            <>
                {features.hasPaymentLinks && (
                    <CreatePaymentLinkDialog
                        open={showPaymentLinkDialog}
                        onOpenChange={setShowPaymentLinkDialog}
                        vendors={vendors}
                    />
                )}

                {features.hasLiveAssist && (
                    <StartLiveSessionDialog
                        open={showGoLiveDialog}
                        onOpenChange={setShowGoLiveDialog}
                        vendorId={practitionerId}
                        vendorCurrency={vendors.find(v => v.id === practitionerId)?.currency || 'AUD'}
                        practitionerSlug={slug}
                    />
                )}
            </>
        </UIContainer>
    );
}
