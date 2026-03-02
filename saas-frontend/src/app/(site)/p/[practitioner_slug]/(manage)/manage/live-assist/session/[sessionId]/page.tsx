import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "../../../../../../../m/_hooks/UseMerchantIdFromSlug";
import UI from "./ui";
import { notFound, redirect } from "next/navigation";

async function LiveSessionDashboardPage({ params }: { params: Promise<{ practitioner_slug: string; sessionId: string }> }) {
    const session = await auth();
    const { practitioner_slug: slug, sessionId } = await params;

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

        return <UI practitionerId={practitionerId} sessionId={sessionId} slug={slug} />;
    } catch {
        notFound();
    }
}

export default LiveSessionDashboardPage;
