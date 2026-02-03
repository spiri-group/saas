// import { merchantIdFromSlug } from "../../../_hooks/UseMerchantIdFromSlug";
import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import UI from "./ui";
import UIContainer from "@/components/uicontainer";

async function DeliveriesPage({ params } : { params: Promise<{ merchant_slug: string }> }) {
    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);

    const session = await auth();
    if (session == null || !session.user) {
        return <></>
    }
    
    return (
        <UIContainer me={session.user}>
        <UI 
            merchantId={merchantId}
        />
        </UIContainer>
    )
}

export default DeliveriesPage;