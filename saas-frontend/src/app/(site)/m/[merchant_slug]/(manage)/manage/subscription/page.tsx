import { merchantIdFromSlug } from "../../../../_hooks/UseMerchantIdFromSlug";
import SubscriptionUI from "./ui";

async function SubscriptionPage({ params } : { params: Promise<{ merchant_slug: string }> }) {

    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);

    return <SubscriptionUI merchantId={merchantId} />;
}

export default SubscriptionPage;