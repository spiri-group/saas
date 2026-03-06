import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import { notFound } from "next/navigation";
import PractitionerGalleryPage from "./ui";

async function GalleryPage({
    params
}: {
    params: Promise<{ practitioner_slug: string }>
}) {
    const { practitioner_slug } = await params;

    try {
        const { merchantId: practitionerId } = await merchantIdFromSlug(practitioner_slug);

        if (!practitionerId) {
            notFound();
        }

        return (
            <PractitionerGalleryPage
                practitionerId={practitionerId}
                slug={practitioner_slug}
            />
        );
    } catch {
        notFound();
    }
}

export default GalleryPage;
