import UI from "./ui";
import { merchantIdFromSlug } from "../../../../../_hooks/UseMerchantIdFromSlug";
import { auth } from "@/lib/auth";

async function CustomersPage({ params } : { params: Promise<{ merchant_slug: string }> }) {
    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);

    const session = await auth();
    if (session == null || !session.user) {
        return <></>
    }
    
    return (
       <UI merchantId={merchantId} me={session.user} />
    )
}

export default CustomersPage;