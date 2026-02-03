import UI from "./ui";
import UIContainer from "@/components/uicontainer";
import { merchantIdFromSlug } from "../../../../_hooks/UseMerchantIdFromSlug";
import { auth } from "@/lib/auth";


async function CasePage({ params } : { params: Promise<{ merchant_slug: string }> }) {
    const session = await auth();
    
    if (session == null || !session.user) {
        return <></>
    }

    const {merchant_slug} = await params;
    const {merchantId} = await merchantIdFromSlug(merchant_slug);

    return (
        <UIContainer me={session.user}>
            <UI merchantId={merchantId} />
        </UIContainer>
    )
}

export default CasePage;