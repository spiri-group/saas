import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import UI from "./ui";

// Note: The folder is named [serviceId] but we're now using it as [serviceSlug]
// The param is still called serviceId for backward compatibility with existing routes
async function ServicePage({ params } : { params: Promise<{ merchant_slug: string, serviceId: string }> }) {

    const { merchant_slug, serviceId: serviceSlug } = await params;
    const { merchantId } = await merchantIdFromSlug(merchant_slug);

    return (
        <>
            <UI
              merchantId={merchantId}
              serviceSlug={serviceSlug}
            />
        </>
    )
}

export default ServicePage;
