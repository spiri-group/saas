'use client';

import { Session } from 'next-auth';
import { useTierFeatures } from '@/hooks/UseTierFeatures';
import PaymentLinksView from '@/components/payment-links/PaymentLinksView';

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
};

export default function PractitionerPaymentLinksUI({ session, practitionerId, slug }: Props) {
    const { features } = useTierFeatures(practitionerId);

    // Build vendors list from session - include practitioner + any merchants
    const vendors = session.user.vendors
        ?.filter(v => v.id && v.name)
        .map(v => ({ id: v.id, name: v.name, currency: v.currency || 'AUD' })) || [];

    return (
        <div className="p-6 max-w-5xl" data-testid="practitioner-payment-links-page">
            <PaymentLinksView
                vendors={vendors}
                hasPaymentLinks={features.hasPaymentLinks}
                upgradeUrl={`/p/${slug}/manage/subscription`}
            />
        </div>
    );
}
