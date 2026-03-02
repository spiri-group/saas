import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import UI from "./ui";

async function MerchantDashboardPage({ params }: { params: Promise<{ merchant_slug: string }> }) {
    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);

    const session = await auth();
    if (session == null || !session.user) {
        return <></>;
    }

    // Get merchant name from session's vendors list
    const merchant = session.user.vendors?.find(v => v.id === merchantId);
    const merchantName = merchant?.name || "Your Shop";

    const vendors = (session.user.vendors || [])
        .filter(v => v.id)
        .map(v => ({ id: v.id, name: v.name, currency: v.currency }));

    return (
        <UI
            merchantId={merchantId}
            merchantSlug={slug}
            merchantName={merchantName}
            me={session.user}
            vendors={vendors}
        />
    );
}

export default MerchantDashboardPage;
