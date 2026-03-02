'use client';

import { Session } from 'next-auth';
import { useTierFeatures } from '@/hooks/UseTierFeatures';
import PaymentLinksView from '@/components/payment-links/PaymentLinksView';

type Props = {
    session: Session;
    merchantId: string;
    slug: string;
};

export default function MerchantPaymentLinksUI({ session, merchantId, slug }: Props) {
    const { features } = useTierFeatures(merchantId);

    // Build vendors list from session - include this merchant + any other profiles
    const vendors = session.user.vendors
        ?.filter(v => v.id && v.name)
        .map(v => ({ id: v.id, name: v.name, currency: v.currency || 'AUD' })) || [];

    return (
        <div className="p-6 max-w-5xl" data-testid="merchant-payment-links-page">
            <PaymentLinksView
                vendors={vendors}
                hasPaymentLinks={features.hasPaymentLinks}
                upgradeUrl={`/m/${slug}/manage/subscription`}
            />
        </div>
    );
}
