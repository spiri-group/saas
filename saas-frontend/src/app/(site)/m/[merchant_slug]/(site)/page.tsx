import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "../../_hooks/UseMerchantIdFromSlug";
import VendorPageContent from "./ui";

async function VendorPage({ params } : { params: Promise<{ merchant_slug: string }> }) {
    const session = await auth();
    const slug = (await params).merchant_slug;
    const { merchantId } = await merchantIdFromSlug(slug);

    return <VendorPageContent session={session} merchantId={merchantId} />;
}



export default VendorPage;