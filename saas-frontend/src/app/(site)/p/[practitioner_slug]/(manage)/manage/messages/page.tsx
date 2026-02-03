import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "../../../../../m/_hooks/UseMerchantIdFromSlug";
import MessageCenter from "../../../../../m/[merchant_slug]/(manage)/manage/customers/messages/ui";
import { notFound, redirect } from "next/navigation";

async function PractitionerMessagesPage({ params }: { params: Promise<{ practitioner_slug: string }> }) {
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

        return <MessageCenter merchantId={practitionerId} />;
    } catch {
        notFound();
    }
}

export default PractitionerMessagesPage;
