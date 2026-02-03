import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "../../../../../m/_hooks/UseMerchantIdFromSlug";
import UI from "./ui";
import { notFound, redirect } from "next/navigation";

async function PractitionerProfilePage({ params }: { params: Promise<{ practitioner_slug: string }> }) {
    const session = await auth();
    const slug = (await params).practitioner_slug;

    if (!session) {
        redirect('/login');
    }

    try {
        const { merchantId: practitionerId } = await merchantIdFromSlug(slug);

        if (!practitionerId) {
            notFound();
        }

        const hasPractitionerAccess = session.user.vendors?.some(
            (vendor) => vendor.id === practitionerId
        );

        if (!hasPractitionerAccess) {
            redirect('/');
        }

        return <UI session={session} practitionerId={practitionerId} slug={slug} />;
    } catch {
        notFound();
    }
}

export default PractitionerProfilePage;
