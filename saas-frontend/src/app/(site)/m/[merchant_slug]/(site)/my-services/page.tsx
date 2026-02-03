import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import { auth } from "@/lib/auth";
import UI from "./ui";

async function MyServicesPage({ params }: { params: Promise<{ merchant_slug: string }> }) {
    const session = await auth();
    const { merchant_slug } = await params;
    const { merchantId } = await merchantIdFromSlug(merchant_slug);

    if (!session?.user?.id) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-lg">Please sign in to view your services</p>
            </div>
        );
    }

    return (
        <UI
            merchantId={merchantId}
            customerId={session.user.id}
        />
    );
}

export default MyServicesPage;
