import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import UI from "./ui";

async function ServiceCheckoutPage({ params }: { params: Promise<{ merchant_slug: string, orderId: string }> }) {
    const { merchant_slug, orderId } = await params;
    const { merchantId } = await merchantIdFromSlug(merchant_slug);

    return (
        <UI
            merchantId={merchantId}
            orderId={orderId}
        />
    );
}

export default ServiceCheckoutPage;
