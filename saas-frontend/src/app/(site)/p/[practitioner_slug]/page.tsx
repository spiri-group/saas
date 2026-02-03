import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "../../m/_hooks/UseMerchantIdFromSlug";
import PractitionerProfileContent from "./ui";
import { notFound } from "next/navigation";

async function PractitionerProfilePage({ params } : { params: Promise<{ practitioner_slug: string }> }) {
    const session = await auth();
    const slug = (await params).practitioner_slug;

    try {
        const { merchantId: practitionerId } = await merchantIdFromSlug(slug);

        if (!practitionerId) {
            notFound();
        }

        return <PractitionerProfileContent session={session} practitionerId={practitionerId} slug={slug} />;
    } catch {
        notFound();
    }
}

export default PractitionerProfilePage;
