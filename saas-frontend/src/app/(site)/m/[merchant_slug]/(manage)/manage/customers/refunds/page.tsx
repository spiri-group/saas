import { auth } from "@/lib/auth";
import UI from "./ui";
import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";

async function RefundsPage({ params } : { params: Promise<{ merchant_slug: string }> }) {
    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);

    const session = await auth();
    if (session == null || !session.user) {
        return <></>
    }

    return (
        <UI 
            merchantId={merchantId}
            merchantSlug={slug}
        />
    );
}

export default RefundsPage;
