import UI from "./ui";
import { merchantIdFromSlug } from "../../../../_hooks/UseMerchantIdFromSlug";
import UIContainer from "@/components/uicontainer";
import { auth } from "@/lib/auth";

async function ServicesPage({ params } : { params: Promise<{ merchant_slug: string }> }) {
    const session = await auth();
    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);
    
    if (session == null) {
        throw new Error("Session is null");
    }

    return (
        <UIContainer me={session.user}>
             <UI merchantId={merchantId} />
        </UIContainer>
    )
}

export default ServicesPage;