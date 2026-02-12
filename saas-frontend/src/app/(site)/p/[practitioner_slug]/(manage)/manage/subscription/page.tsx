import { merchantIdFromSlug } from "../../../../../m/_hooks/UseMerchantIdFromSlug";
import SubscriptionUI from "./ui";

async function PractitionerSubscriptionPage({ params }: { params: Promise<{ practitioner_slug: string }> }) {
    const slug = (await params).practitioner_slug;
    const { merchantId: practitionerId } = await merchantIdFromSlug(slug);

    return <SubscriptionUI practitionerId={practitionerId} />;
}

export default PractitionerSubscriptionPage;
