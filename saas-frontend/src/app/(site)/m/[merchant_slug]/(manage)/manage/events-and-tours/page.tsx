import UI from "./ui";
import { merchantIdFromSlug } from "../../../../_hooks/UseMerchantIdFromSlug";

async function ScheduleSessionPage({ params } : { params: Promise<{ merchant_slug: string }> }) {

    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);

    return (
        <UI merchantId={merchantId} />
    )
}

export default ScheduleSessionPage;