import UI from "./ui";
import { merchantIdFromSlug } from "../../../../../_hooks/UseMerchantIdFromSlug";

async function TourPage({ params } : { params: Promise<{ merchant_slug: string, tourId: string }> }) {

    const { merchant_slug, tourId } = await params;

    const {merchantId} = await merchantIdFromSlug(merchant_slug);
    
    return (
        <>
            <UI
              merchantId={merchantId}
              tourId={tourId}
            />
        </>
    )
}

export default TourPage;