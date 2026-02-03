import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "../../../../../_hooks/UseMerchantIdFromSlug";
import UI from "./ui";

async function MessagesPage({ params }: { params: Promise<{ merchant_slug: string }> }) {
    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);

    const session = await auth();
    if (session == null || !session.user) {
        return <></>;
    }
    
    return (
        <UI merchantId={merchantId} />
    );
}

export default MessagesPage;