import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "../../../../_hooks/UseMerchantIdFromSlug";
import UI from "./ui";

async function MerchantPaymentLinksPage({ params }: { params: Promise<{ merchant_slug: string }> }) {
    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);

    const session = await auth();
    if (session == null || !session.user) {
        return <></>;
    }

    return (
        <UI
            session={session}
            merchantId={merchantId}
            slug={slug}
        />
    );
}

export default MerchantPaymentLinksPage;
