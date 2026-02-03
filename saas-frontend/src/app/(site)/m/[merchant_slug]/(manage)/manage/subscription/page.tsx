import { merchantIdFromSlug } from "../../../../_hooks/UseMerchantIdFromSlug";

async function SubscriptionPage({ params } : { params: Promise<{ merchant_slug: string }> }) {

    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);
    
    return (
        <>
            <h1>Subscription Page for Merchant: {merchantId}</h1>
        </>
    )
}

export default SubscriptionPage;