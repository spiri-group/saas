'use client';

import SubscriptionManagement from '@/components/subscription/SubscriptionManagement';

type Props = {
    merchantId: string;
};

export default function SubscriptionUI({ merchantId }: Props) {
    return (
        <div className="h-screen-minus-nav p-4 md:p-6 overflow-auto">
            <div className="max-w-3xl mx-auto">
                <h1 data-testid="subscription-page-heading" className="text-2xl font-bold text-white mb-6">
                    Subscription
                </h1>
                <SubscriptionManagement vendorId={merchantId} profileType="merchant" />
            </div>
        </div>
    );
}
