import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import { auth } from "@/lib/auth";
import UI from "./ui";

async function ServiceOrderDetailsPage({ params }: { params: Promise<{ merchant_slug: string, orderId: string }> }) {
    const session = await auth();
    const { merchant_slug, orderId } = await params;
    const { merchantId } = await merchantIdFromSlug(merchant_slug);

    if (!session?.user?.id) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-lg">Please sign in to view this service</p>
            </div>
        );
    }

    return (
        <UI
            merchantId={merchantId}
            orderId={orderId}
        />
    );
}

export default ServiceOrderDetailsPage;
