import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "../../../../m/_hooks/UseMerchantIdFromSlug";
import PractitionerDashboard from "./ui";
import { notFound, redirect } from "next/navigation";

async function PractitionerManagePage({ params }: { params: Promise<{ practitioner_slug: string }> }) {
    const session = await auth();
    const slug = (await params).practitioner_slug;

    // Must be logged in
    if (!session) {
        redirect('/login');
    }

    try {
        const { merchantId: practitionerId } = await merchantIdFromSlug(slug);

        if (!practitionerId) {
            notFound();
        }

        // Check if user has access to this practitioner
        const practitioner = session.user.vendors?.find(
            (vendor) => vendor.id === practitionerId
        );

        if (!practitioner) {
            redirect('/');
        }

        const practitionerName = practitioner.name || 'Practitioner';

        return (
            <PractitionerDashboard
                session={session}
                practitionerId={practitionerId}
                slug={slug}
                practitionerName={practitionerName}
            />
        );
    } catch {
        notFound();
    }
}

export default PractitionerManagePage;
