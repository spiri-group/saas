import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import { notFound } from "next/navigation";
import UI from "./ui";

async function PractitionerServicePage({
    params
}: {
    params: Promise<{ practitioner_slug: string; serviceId: string }>
}) {
    const { practitioner_slug, serviceId: serviceSlug } = await params;

    try {
        const { merchantId: practitionerId } = await merchantIdFromSlug(practitioner_slug);

        if (!practitionerId) {
            notFound();
        }

        return (
            <UI
                practitionerId={practitionerId}
                practitionerSlug={practitioner_slug}
                serviceSlug={serviceSlug}
            />
        );
    } catch {
        notFound();
    }
}

export default PractitionerServicePage;
