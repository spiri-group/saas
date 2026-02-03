import UI from "./ui";
import { merchantIdFromSlug } from "../../../../../_hooks/UseMerchantIdFromSlug";

async function TourAnalyticsPage({ params }: { params: Promise<{ merchant_slug: string }> }) {
    const { merchant_slug } = await params;
    const { merchantId } = await merchantIdFromSlug(merchant_slug);

    return <UI merchantId={merchantId} />;
}

export default TourAnalyticsPage;
