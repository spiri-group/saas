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
        const hasPractitionerAccess = session.user.vendors?.some(
            (vendor) => vendor.id === practitionerId
        );

        if (!hasPractitionerAccess) {
            redirect('/');
        }

        return <PractitionerDashboard session={session} practitionerId={practitionerId} slug={slug} />;
    } catch {
        notFound();
    }
}

export default PractitionerManagePage;
